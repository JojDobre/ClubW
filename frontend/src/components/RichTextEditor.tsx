// frontend/src/components/RichTextEditor.tsx
// Vlastný Rich Text Editor bez externých knižníc - okamžité načítanie

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ===== TYPY A INTERFACE =====
interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
  onInit?: () => void;
  id?: string;
}

// ===== HLAVNÁ KOMPONENTA =====
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Začnite písať váš článok...',
  height = 400,
  disabled = false,
  onInit,
  id
}) => {
  // ===== STATE MANAGEMENT =====
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentTheme, setCurrentTheme] = useState<string>('white');
  const [isActive, setIsActive] = useState(false);

  // ===== DETEKCIA TÉMY =====
  useEffect(() => {
    const detectTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme') || 'white';
      setCurrentTheme(theme);
    };

    detectTheme();
    
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // ===== POMOCNÉ FUNKCIE =====
  
  // Získanie pozadia editora podľa témy
  const getEditorBackground = (theme: string): string => {
    switch (theme) {
      case 'dark':
        return 'var(--color-surface, #1e293b)';
      case 'dark-bright':
        return 'var(--color-background, #0f172a)';
      default:
        return 'var(--color-surface, #ffffff)';
    }
  };

  // Získanie farby textu podľa témy
  const getTextColor = (theme: string): string => {
    switch (theme) {
      case 'dark':
      case 'dark-bright':
        return 'var(--color-text-primary, #f8fafc)';
      default:
        return 'var(--color-text-primary, #374151)';
    }
  };

  // ===== EDITOR FUNKCIE =====
  
  // Vykonanie formátovacieho príkazu
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  }, []);

  // Handling zmeny obsahu
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  }, [onChange]);

  // Handling paste eventu
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleContentChange();
  }, [handleContentChange]);

  // Handling key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+B = Bold
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      execCommand('bold');
    }
    // Ctrl+I = Italic
    else if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      execCommand('italic');
    }
    // Ctrl+U = Underline
    else if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      execCommand('underline');
    }
    // Enter = nový riadok
    else if (e.key === 'Enter' && !e.shiftKey) {
      // Nechaj default behavior pre <p> tagy
    }
  }, [execCommand]);

  // ===== TOOLBAR KOMPONENTY =====
  
  // Toolbar tlačidlo
  const ToolbarButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, active = false, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: '8px 12px',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        background: active ? 'var(--color-primary)' : 'var(--color-surface)',
        color: active ? 'white' : 'var(--color-text-primary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        minWidth: '36px',
        height: '36px'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.target as HTMLElement).style.background = 'var(--color-background)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.target as HTMLElement).style.background = 'var(--color-surface)';
        }
      }}
    >
      {children}
    </button>
  );

  // Select pre nadpisy
  const HeadingSelect: React.FC = () => (
    <select
      onChange={(e) => {
        const value = e.target.value;
        if (value === 'p') {
          execCommand('formatBlock', '<p>');
        } else {
          execCommand('formatBlock', `<${value}>`);
        }
        e.target.value = '';
      }}
      style={{
        padding: '8px 12px',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        fontSize: '14px',
        cursor: 'pointer',
        minWidth: '120px',
        height: '36px'
      }}
      defaultValue=""
    >
      <option value="" disabled>Formát</option>
      <option value="p">Odsek</option>
      <option value="h1">Nadpis 1</option>
      <option value="h2">Nadpis 2</option>
      <option value="h3">Nadpis 3</option>
    </select>
  );

  // ===== INICIALIZÁCIA =====
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      if (onInit) onInit();
    }
  }, []);

  // Update obsahu pri zmene value prop
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // ===== RENDER =====
  return (
    <div 
      style={{ 
        marginBottom: '20px',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        background: 'var(--color-surface)',
        overflow: 'hidden'
      }}
      className="rich-text-editor-container"
    >
      {/* Toolbar */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
        background: 'var(--color-surface)'
      }}>
        {/* Formát */}
        <HeadingSelect />
        
        {/* Separator */}
        <div style={{
          width: '1px',
          height: '24px',
          background: 'var(--color-border)',
          margin: '0 4px'
        }} />
        
        {/* Základné formátovanie */}
        <ToolbarButton
          onClick={() => execCommand('bold')}
          title="Tučné (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => execCommand('italic')}
          title="Kurzíva (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => execCommand('underline')}
          title="Podčiarknuté (Ctrl+U)"
        >
          <u>U</u>
        </ToolbarButton>
        
        {/* Separator */}
        <div style={{
          width: '1px',
          height: '24px',
          background: 'var(--color-border)',
          margin: '0 4px'
        }} />
        
        {/* Zarovnanie */}
        <ToolbarButton
          onClick={() => execCommand('justifyLeft')}
          title="Zarovnať vľavo"
        >
          ⫷
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => execCommand('justifyCenter')}
          title="Zarovnať na stred"
        >
          ≡
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => execCommand('justifyRight')}
          title="Zarovnať vpravo"
        >
          ⫸
        </ToolbarButton>
        
        {/* Separator */}
        <div style={{
          width: '1px',
          height: '24px',
          background: 'var(--color-border)',
          margin: '0 4px'
        }} />
        
        {/* Zoznamy */}
        <ToolbarButton
          onClick={() => execCommand('insertUnorderedList')}
          title="Zoznam s odrážkami"
        >
          • • •
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => execCommand('insertOrderedList')}
          title="Číslovaný zoznam"
        >
          1. 2. 3.
        </ToolbarButton>
        
        {/* Separator */}
        <div style={{
          width: '1px',
          height: '24px',
          background: 'var(--color-border)',
          margin: '0 4px'
        }} />
        
        {/* Link */}
        <ToolbarButton
          onClick={() => {
            const url = prompt('Zadajte URL:');
            if (url) {
              execCommand('createLink', url);
            }
          }}
          title="Vložiť odkaz"
        >
          🔗
        </ToolbarButton>
        
        {/* Odstránenie formátovania */}
        <ToolbarButton
          onClick={() => execCommand('removeFormat')}
          title="Odstrániť formátovanie"
        >
          ✕
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleContentChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        style={{
          minHeight: `${height - 60}px`, // -60px pre toolbar
          padding: '16px',
          background: getEditorBackground(currentTheme),
          color: getTextColor(currentTheme),
          fontSize: '16px',
          lineHeight: '1.6',
          outline: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          cursor: 'text',
          overflowY: 'auto'
        }}
        data-placeholder={placeholder}
      />

      {/* CSS štýly */}
      <style>
        {`
          .rich-text-editor-container [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: var(--color-text-muted, #9ca3af);
            font-style: italic;
          }
          
          .rich-text-editor-container [contenteditable] h1,
          .rich-text-editor-container [contenteditable] h2,
          .rich-text-editor-container [contenteditable] h3 {
            margin: 1.5em 0 0.5em 0;
            font-weight: 600;
            color: ${getTextColor(currentTheme)};
          }
          
          .rich-text-editor-container [contenteditable] h1 {
            font-size: 1.8em;
          }
          
          .rich-text-editor-container [contenteditable] h2 {
            font-size: 1.4em;
          }
          
          .rich-text-editor-container [contenteditable] h3 {
            font-size: 1.2em;
          }
          
          .rich-text-editor-container [contenteditable] p {
            margin: 0 0 1em 0;
          }
          
          .rich-text-editor-container [contenteditable] ul,
          .rich-text-editor-container [contenteditable] ol {
            margin: 1em 0;
            padding-left: 2em;
          }
          
          .rich-text-editor-container [contenteditable] li {
            margin: 0.5em 0;
          }
          
          .rich-text-editor-container [contenteditable] a {
            color: var(--color-primary, #3b82f6);
            text-decoration: underline;
          }
          
          .rich-text-editor-container [contenteditable] strong {
            font-weight: 600;
          }
          
          .rich-text-editor-container [contenteditable] em {
            font-style: italic;
          }
          
          .rich-text-editor-container [contenteditable]:focus {
            box-shadow: inset 0 0 0 1px var(--color-primary, #3b82f6);
          }
          
          /* Dark mode support */
          [data-theme="dark"] .rich-text-editor-container [contenteditable] h1,
          [data-theme="dark"] .rich-text-editor-container [contenteditable] h2,
          [data-theme="dark"] .rich-text-editor-container [contenteditable] h3,
          [data-theme="dark-bright"] .rich-text-editor-container [contenteditable] h1,
          [data-theme="dark-bright"] .rich-text-editor-container [contenteditable] h2,
          [data-theme="dark-bright"] .rich-text-editor-container [contenteditable] h3 {
            color: var(--color-text-primary, #f8fafc);
          }
          
          /* Responsive toolbar */
          @media (max-width: 768px) {
            .rich-text-editor-container > div:first-child {
              padding: 8px;
              gap: 6px;
            }
            
            .rich-text-editor-container > div:first-child button,
            .rich-text-editor-container > div:first-child select {
              min-width: 32px;
              height: 32px;
              padding: 6px 8px;
              font-size: 13px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default RichTextEditor;