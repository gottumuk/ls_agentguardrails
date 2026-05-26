"""
Error Handling Utility Module

Provides centralized error handling, structured error responses, and exponential
backoff retry logic for all Lambda functions.

Requirements: 12.1, 12.2
"""

import json
import time
import logging
from typing import Dict, Any, Callable, Optional, List
from functools import wraps
from botocore.exceptions import ClientError


# Configure logging
logger = logging.getLogger()


class AWSServiceError(Exception):
    """Custom exception for AWS service errors with structured information."""
    
    def __init__(self, service: str, error_code: str, message: str, retryable: bool = False):
        self.service = service
        self.error_code = error_code
        self.message = message
        self.retryable = retryable
        super().__init__(f"{service} error ({error_code}): {message}")


class RetryConfig:
    """Configuration for exponential backoff retry logic."""
    
    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 10.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter


# Default retry configuration
DEFAULT_RETRY_CONFIG = RetryConfig()

# Retryable AWS error codes
RETRYABLE_ERROR_CODES = {
    'ThrottlingException',
    'TooManyRequestsException',
    'ProvisionedThroughputExceededException',
    'RequestLimitExceeded',
    'ServiceUnavailable',
    'InternalServerError',
    'RequestTimeout',
    'SlowDown'
}


def is_retryable_error(error: ClientError) -> bool:
    """
    Determine if an AWS ClientError is retryable.
    
    Args:
        error: boto3 ClientError exception
        
    Returns:
        True if error is retryable, False otherwise
    """
    error_code = error.response['Error']['Code']
    return error_code in RETRYABLE_ERROR_CODES


def calculate_backoff_delay(attempt: int, config: RetryConfig) -> float:
    """
    Calculate exponential backoff delay with optional jitter.
    
    Args:
        attempt: Current attempt number (0-indexed)
        config: Retry configuration
        
    Returns:
        Delay in seconds
    """
    import random
    
    # Calculate exponential delay
    delay = min(
        config.base_delay * (config.exponential_base ** attempt),
        config.max_delay
    )
    
    # Add jitter to prevent thundering herd
    if config.jitter:
        delay = delay * (0.5 + random.random() * 0.5)
    
    return delay


def retry_with_backoff(
    func: Callable,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    retryable_exceptions: Optional[List[type]] = None
) -> Callable:
    """
    Decorator to retry a function with exponential backoff.
    
    Args:
        func: Function to retry
        config: Retry configuration
        retryable_exceptions: List of exception types to retry (in addition to retryable ClientErrors)
        
    Returns:
        Wrapped function with retry logic
    """
    if retryable_exceptions is None:
        retryable_exceptions = []
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        last_exception = None
        
        for attempt in range(config.max_attempts):
            try:
                return func(*args, **kwargs)
                
            except ClientError as e:
                last_exception = e
                
                # Check if error is retryable
                if not is_retryable_error(e):
                    raise
                
                # Log retry attempt
                error_code = e.response['Error']['Code']
                logger.warning(
                    f"Retryable error {error_code} on attempt {attempt + 1}/{config.max_attempts}. "
                    f"Retrying after backoff..."
                )
                
                # Don't sleep on last attempt
                if attempt < config.max_attempts - 1:
                    delay = calculate_backoff_delay(attempt, config)
                    logger.info(f"Backing off for {delay:.2f} seconds")
                    time.sleep(delay)
                    
            except tuple(retryable_exceptions) as e:
                last_exception = e
                
                logger.warning(
                    f"Retryable exception {type(e).__name__} on attempt {attempt + 1}/{config.max_attempts}. "
                    f"Retrying after backoff..."
                )
                
                # Don't sleep on last attempt
                if attempt < config.max_attempts - 1:
                    delay = calculate_backoff_delay(attempt, config)
                    logger.info(f"Backing off for {delay:.2f} seconds")
                    time.sleep(delay)
        
        # All retries exhausted
        logger.error(f"All {config.max_attempts} retry attempts exhausted")
        raise last_exception
    
    return wrapper


def handle_aws_error(error: ClientError, service: str) -> AWSServiceError:
    """
    Convert boto3 ClientError to structured AWSServiceError.
    
    Args:
        error: boto3 ClientError exception
        service: AWS service name (e.g., 'Bedrock', 'DynamoDB', 'Neptune')
        
    Returns:
        AWSServiceError with structured information
    """
    error_code = error.response['Error']['Code']
    error_message = error.response['Error']['Message']
    retryable = is_retryable_error(error)
    
    # Log the error
    logger.error(
        f"{service} error: {error_code} - {error_message}",
        extra={
            'service': service,
            'error_code': error_code,
            'retryable': retryable
        }
    )
    
    return AWSServiceError(
        service=service,
        error_code=error_code,
        message=error_message,
        retryable=retryable
    )


def format_error_response(
    status_code: int,
    message: str,
    service: Optional[str] = None,
    error_code: Optional[str] = None,
    retryable: bool = False,
    retry_after: Optional[int] = None
) -> Dict[str, Any]:
    """
    Format a structured error response for API Gateway.
    
    Requirements: 12.1
    
    Args:
        status_code: HTTP status code
        message: Error message
        service: AWS service name (optional)
        error_code: AWS error code (optional)
        retryable: Whether error is retryable (optional)
        retry_after: Suggested retry delay in milliseconds (optional)
        
    Returns:
        Formatted error response dict
    """
    error_body = {
        'error': True,
        'message': message
    }
    
    if service:
        error_body['service'] = service
    
    if error_code:
        error_body['error_code'] = error_code
    
    if retryable:
        error_body['retryable'] = True
        
        if retry_after:
            error_body['retry_after'] = retry_after
    
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(error_body)
    }


def format_success_response(
    data: Dict[str, Any],
    status_code: int = 200
) -> Dict[str, Any]:
    """
    Format a successful API response.
    
    Args:
        data: Response data
        status_code: HTTP status code (default 200)
        
    Returns:
        Formatted success response dict
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, default=str)
    }


def lambda_error_handler(func: Callable) -> Callable:
    """
    Decorator to handle errors in Lambda functions and return structured responses.
    
    Requirements: 12.1, 12.2
    
    Args:
        func: Lambda handler function
        
    Returns:
        Wrapped function with error handling
    """
    @wraps(func)
    def wrapper(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        try:
            return func(event, context)
            
        except AWSServiceError as e:
            # Structured AWS service error
            logger.error(f"AWS service error: {str(e)}")
            
            # Determine status code based on error
            if e.error_code == 'ThrottlingException':
                status_code = 429
                retry_after = 1000  # 1 second
            elif e.error_code in ['ResourceNotFoundException', 'ValidationException']:
                status_code = 404
                retry_after = None
            else:
                status_code = 500
                retry_after = None
            
            return format_error_response(
                status_code=status_code,
                message=e.message,
                service=e.service,
                error_code=e.error_code,
                retryable=e.retryable,
                retry_after=retry_after
            )
            
        except ClientError as e:
            # Unhandled boto3 error
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            logger.error(f"Unhandled AWS error: {error_code} - {error_message}")
            
            return format_error_response(
                status_code=500,
                message=f"AWS service error: {error_message}",
                error_code=error_code
            )
            
        except ValueError as e:
            # Validation error
            logger.warning(f"Validation error: {str(e)}")
            
            return format_error_response(
                status_code=400,
                message=str(e)
            )
            
        except Exception as e:
            # Unexpected error
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            
            return format_error_response(
                status_code=500,
                message="Internal server error"
            )
    
    return wrapper


# Service-specific error handlers

def handle_bedrock_error(error: ClientError) -> AWSServiceError:
    """Handle Bedrock-specific errors."""
    return handle_aws_error(error, 'Bedrock')


def handle_dynamodb_error(error: ClientError) -> AWSServiceError:
    """Handle DynamoDB-specific errors."""
    return handle_aws_error(error, 'DynamoDB')


def handle_neptune_error(error: ClientError) -> AWSServiceError:
    """Handle Neptune-specific errors."""
    return handle_aws_error(error, 'Neptune')


def handle_stepfunctions_error(error: ClientError) -> AWSServiceError:
    """Handle Step Functions-specific errors."""
    return handle_aws_error(error, 'StepFunctions')


def handle_sns_error(error: ClientError) -> AWSServiceError:
    """Handle SNS-specific errors."""
    return handle_aws_error(error, 'SNS')


def handle_cloudwatch_error(error: ClientError) -> AWSServiceError:
    """Handle CloudWatch Logs-specific errors."""
    return handle_aws_error(error, 'CloudWatch')
