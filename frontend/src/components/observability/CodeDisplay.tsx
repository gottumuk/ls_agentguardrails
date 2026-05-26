import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface CodeFile {
  path: string;
  content: string;
  language: string;
  highlightLine?: number;
}

interface CodeDisplayProps {
  files: CodeFile[];
  currentFile?: string;
  onFileChange?: (path: string) => void;
}

export const CodeDisplay: React.FC<CodeDisplayProps> = ({
  files,
  currentFile,
  onFileChange
}) => {
  const [selectedFile, setSelectedFile] = useState<string>(currentFile || files[0]?.path || '');

  useEffect(() => {
    if (currentFile && currentFile !== selectedFile) {
      setSelectedFile(currentFile);
    }
  }, [currentFile]);

  const handleFileChange = (path: string) => {
    setSelectedFile(path);
    onFileChange?.(path);
  };

  const currentFileData = files.find(f => f.path === selectedFile) || files[0];

  if (!currentFileData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#9ca3af',
        backgroundColor: '#1f2937'
      }}>
        No code files available
      </div>
    );
  }

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'groovy':
        return 'groovy';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };

  const language = currentFileData.language || getLanguageFromPath(currentFileData.path);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1f2937'
    }}>
      {/* File Tabs */}
      {files.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '8px',
          borderBottom: '1px solid #374151',
          overflowX: 'auto',
          backgroundColor: '#111827'
        }}>
          {files.map(file => (
            <button
              key={file.path}
              onClick={() => handleFileChange(file.path)}
              style={{
                padding: '6px 12px',
                backgroundColor: selectedFile === file.path ? '#374151' : '#1f2937',
                color: selectedFile === file.path ? '#f9fafb' : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: selectedFile === file.path ? '600' : '400',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {file.path.split('/').pop()}
            </button>
          ))}
        </div>
      )}

      {/* File Path */}
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#111827',
        borderBottom: '1px solid #374151',
        fontSize: '11px',
        color: '#6b7280',
        fontFamily: 'monospace'
      }}>
        {currentFileData.path}
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language={language}
          value={currentFileData.content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            automaticLayout: true,
            wordWrap: 'on',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible'
            }
          }}
          onMount={(editor) => {
            // Highlight current line if specified
            if (currentFileData.highlightLine) {
              editor.revealLineInCenter(currentFileData.highlightLine);
              editor.setPosition({
                lineNumber: currentFileData.highlightLine,
                column: 1
              });
            }
          }}
        />
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '6px 12px',
        backgroundColor: '#111827',
        borderTop: '1px solid #374151',
        fontSize: '11px',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>{language.toUpperCase()}</span>
        {currentFileData.highlightLine && (
          <span>Line {currentFileData.highlightLine}</span>
        )}
      </div>
    </div>
  );
};
