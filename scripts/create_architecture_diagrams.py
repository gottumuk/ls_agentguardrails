#!/usr/bin/env python3
"""Generate professional AWS architecture diagrams using the diagrams library.

Produces 7 diagrams with official AWS icons:
1. Overall System Architecture
2. Demo 1 - TACT Engine Architecture
3. Demo 2 - Guardrails Architecture
4. Demo 3 - Neptune Graph Architecture
5. Demo 4 - Step Functions Approval Workflow
6. Data Flow Summary
7. Deployment Architecture
"""

import os
from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.network import APIGateway, CloudFront
from diagrams.aws.database import Neptune, Dynamodb as DynamoDB
from diagrams.aws.ml import Bedrock
from diagrams.aws.integration import StepFunctions, SNS
from diagrams.aws.management import Cloudwatch, Cloudtrail
from diagrams.aws.storage import S3
from diagrams.aws.security import Cognito
from diagrams.aws.general import Users

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "diagrams-python")
os.makedirs(OUTPUT_DIR, exist_ok=True)

graph_attr = {
    "fontsize": "14",
    "bgcolor": "white",
    "pad": "0.5",
    "nodesep": "0.8",
    "ranksep": "1.0",
}


def diagram_01_overall():
    """Overall System Architecture."""
    with Diagram(
        "AWS Agent Governance - Overall Architecture",
        filename=os.path.join(OUTPUT_DIR, "01-overall-system-architecture"),
        show=False,
        direction="LR",
        graph_attr=graph_attr,
    ):
        users = Users("Livestream\nViewers")

        with Cluster("Frontend"):
            cloudfront = CloudFront("CloudFront")
            s3 = S3("S3 Static\nHosting")

        with Cluster("API Layer"):
            apigw = APIGateway("REST API\nGateway")
            ws_api = APIGateway("WebSocket\nAPI")

        with Cluster("Demo 1 - TACT Engine"):
            tact = Lambda("tact_evaluation")
            bedrock_tact = Bedrock("Amazon\nBedrock")

        with Cluster("Demo 2 - Guardrails"):
            guardrails = Lambda("guardrails_query")
            bedrock_guard = Bedrock("Bedrock\nGuardrails")

        with Cluster("Demo 3 - Neptune Graph"):
            neptune_fn = Lambda("neptune_scoring")
            neptune_db = Neptune("Neptune\nServerless")

        with Cluster("Demo 4 - Approval Workflow"):
            approval_wf = Lambda("approval_workflow")
            approval_dec = Lambda("approval_decision")
            audit = Lambda("audit_trail")
            sns_notify = Lambda("sns_notification")
            sfn = StepFunctions("Step\nFunctions")
            sns = SNS("SNS")

        with Cluster("Data & Observability"):
            dynamo = DynamoDB("DynamoDB\nTables")
            observability = Lambda("observability")
            cloudwatch = Cloudwatch("CloudWatch")
            cloudtrail = Cloudtrail("CloudTrail")

        with Cluster("Data Seeding"):
            seed = Lambda("seed_data")
            reset = Lambda("reset_demo")

        users >> cloudfront >> s3
        users >> apigw
        apigw >> tact >> bedrock_tact
        apigw >> guardrails >> bedrock_guard
        apigw >> neptune_fn >> neptune_db
        apigw >> approval_wf >> sfn
        sfn >> approval_dec
        sfn >> audit
        sfn >> sns_notify >> sns
        tact >> dynamo
        guardrails >> dynamo
        observability >> cloudwatch
        ws_api >> observability
        seed >> dynamo
        seed >> neptune_db
        reset >> dynamo
        reset >> neptune_db


def diagram_02_tact():
    """Demo 1 - TACT Engine Architecture."""
    with Diagram(
        "Demo 1 - TACT Evaluation Engine",
        filename=os.path.join(OUTPUT_DIR, "02-demo1-tact-architecture"),
        show=False,
        direction="LR",
        graph_attr=graph_attr,
    ):
        users = Users("Viewer")
        apigw = APIGateway("API Gateway\n/evaluate")

        with Cluster("TACT Engine"):
            tact = Lambda("tact_evaluation")
            bedrock = Bedrock("Amazon Bedrock\nClaude")

        with Cluster("Storage"):
            dynamo = DynamoDB("Evaluations\nTable")

        with Cluster("Observability"):
            obs = Lambda("observability")
            cw = Cloudwatch("CloudWatch\nLogs")

        users >> apigw >> tact
        tact >> bedrock
        tact >> dynamo
        tact >> obs >> cw


def diagram_03_guardrails():
    """Demo 2 - Guardrails Architecture."""
    with Diagram(
        "Demo 2 - Bedrock Guardrails",
        filename=os.path.join(OUTPUT_DIR, "03-demo2-guardrails-architecture"),
        show=False,
        direction="LR",
        graph_attr=graph_attr,
    ):
        users = Users("Viewer")
        apigw = APIGateway("API Gateway\n/guardrails")

        with Cluster("Guardrails Engine"):
            guardrails = Lambda("guardrails_query")
            bedrock = Bedrock("Bedrock\nGuardrails")

        with Cluster("Policy Store"):
            dynamo = DynamoDB("Guardrails\nConfig Table")

        with Cluster("Observability"):
            obs = Lambda("observability")
            cw = Cloudwatch("CloudWatch")

        users >> apigw >> guardrails
        guardrails >> bedrock
        guardrails >> dynamo
        guardrails >> obs >> cw


def diagram_04_neptune():
    """Demo 3 - Neptune Graph Architecture."""
    with Diagram(
        "Demo 3 - Neptune Trust Graph",
        filename=os.path.join(OUTPUT_DIR, "04-demo3-neptune-architecture"),
        show=False,
        direction="LR",
        graph_attr=graph_attr,
    ):
        users = Users("Viewer")
        apigw = APIGateway("API Gateway\n/neptune")

        with Cluster("Graph Scoring"):
            neptune_fn = Lambda("neptune_scoring")

        with Cluster("VPC"):
            neptune = Neptune("Neptune\nServerless")

        with Cluster("Storage"):
            dynamo = DynamoDB("Graph Results\nTable")

        with Cluster("Observability"):
            obs = Lambda("observability")
            cw = Cloudwatch("CloudWatch")

        users >> apigw >> neptune_fn
        neptune_fn >> neptune
        neptune_fn >> dynamo
        neptune_fn >> obs >> cw


def diagram_05_stepfunctions():
    """Demo 4 - Step Functions Approval Workflow."""
    with Diagram(
        "Demo 4 - Step Functions Approval Workflow",
        filename=os.path.join(OUTPUT_DIR, "05-demo4-stepfunctions-architecture"),
        show=False,
        direction="LR",
        graph_attr=graph_attr,
    ):
        users = Users("Viewer")
        apigw = APIGateway("API Gateway\n/approval")

        with Cluster("Orchestration"):
            approval_wf = Lambda("approval_workflow")
            sfn = StepFunctions("State Machine")

        with Cluster("Workflow Steps"):
            approval_dec = Lambda("approval_decision")
            audit = Lambda("audit_trail")
            sns_fn = Lambda("sns_notification")

        with Cluster("Notifications"):
            sns = SNS("SNS Topic")

        with Cluster("Storage"):
            dynamo = DynamoDB("Audit Trail\nTable")

        with Cluster("AI Decision"):
            bedrock = Bedrock("Amazon Bedrock\nClaude")

        users >> apigw >> approval_wf >> sfn
        sfn >> approval_dec >> bedrock
        sfn >> audit >> dynamo
        sfn >> sns_fn >> sns


def diagram_06_data_flow():
    """Data Flow Summary."""
    with Diagram(
        "Data Flow Summary",
        filename=os.path.join(OUTPUT_DIR, "06-data-flow-summary"),
        show=False,
        direction="TB",
        graph_attr=graph_attr,
    ):
        with Cluster("Client"):
            users = Users("React Frontend")

        with Cluster("Ingress"):
            cf = CloudFront("CloudFront")
            apigw = APIGateway("API Gateway")

        with Cluster("Compute"):
            tact = Lambda("TACT")
            guard = Lambda("Guardrails")
            neptune_fn = Lambda("Neptune\nScoring")
            approval = Lambda("Approval\nWorkflow")

        with Cluster("AI/ML"):
            bedrock = Bedrock("Amazon\nBedrock")

        with Cluster("Data Stores"):
            dynamo = DynamoDB("DynamoDB")
            neptune = Neptune("Neptune")

        with Cluster("Orchestration"):
            sfn = StepFunctions("Step Functions")
            sns = SNS("SNS")

        users >> cf
        users >> apigw
        apigw >> [tact, guard, neptune_fn, approval]
        tact >> bedrock
        guard >> bedrock
        tact >> dynamo
        guard >> dynamo
        neptune_fn >> neptune
        approval >> sfn >> sns


def diagram_07_deployment():
    """Deployment Architecture."""
    with Diagram(
        "Deployment Architecture",
        filename=os.path.join(OUTPUT_DIR, "07-deployment-architecture"),
        show=False,
        direction="TB",
        graph_attr=graph_attr,
    ):
        with Cluster("CI/CD"):
            s3_code = S3("Lambda Code\nBucket")
            s3_templates = S3("CFN Templates\nBucket")

        with Cluster("Frontend Hosting"):
            cf = CloudFront("CloudFront\nDistribution")
            s3_web = S3("S3 Static\nWebsite")
            cognito = Cognito("Cognito\nIdentity Pool")

        with Cluster("API Layer"):
            apigw = APIGateway("REST API")
            ws = APIGateway("WebSocket API")

        with Cluster("Compute (Lambda)"):
            lambdas = Lambda("10 Lambda\nFunctions")

        with Cluster("Data Layer"):
            dynamo = DynamoDB("3 DynamoDB\nTables")
            neptune = Neptune("Neptune\nServerless")

        with Cluster("AI/ML"):
            bedrock = Bedrock("Bedrock +\nGuardrails")

        with Cluster("Orchestration"):
            sfn = StepFunctions("Step Functions")
            sns = SNS("SNS")

        with Cluster("Observability"):
            cw = Cloudwatch("CloudWatch\nDashboard")
            ct = Cloudtrail("CloudTrail")

        s3_code >> lambdas
        s3_templates >> apigw
        cf >> s3_web
        apigw >> lambdas
        ws >> lambdas
        lambdas >> dynamo
        lambdas >> neptune
        lambdas >> bedrock
        lambdas >> sfn
        sfn >> sns
        lambdas >> cw
        ct >> s3_code


if __name__ == "__main__":
    print("Generating architecture diagrams...")
    diagram_01_overall()
    print("  ✓ 01 - Overall System Architecture")
    diagram_02_tact()
    print("  ✓ 02 - Demo 1 TACT Architecture")
    diagram_03_guardrails()
    print("  ✓ 03 - Demo 2 Guardrails Architecture")
    diagram_04_neptune()
    print("  ✓ 04 - Demo 3 Neptune Architecture")
    diagram_05_stepfunctions()
    print("  ✓ 05 - Demo 4 Step Functions Architecture")
    diagram_06_data_flow()
    print("  ✓ 06 - Data Flow Summary")
    diagram_07_deployment()
    print("  ✓ 07 - Deployment Architecture")
    print(f"\nAll diagrams saved to: {OUTPUT_DIR}/")
