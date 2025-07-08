// frontend/src/components/RichTextEditor.tsx
// TinyMCE Rich Text Editor komponenta pre články

import React, { useRef, useEffect } from 'react';

// Import TinyMCE
declare global {
  interface Window {
    tinymce: any;
  }
}

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
  onInit?: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Začnite písať váš článok...',
  height = 400,
  disabled = false,
  onInit
}) => {
  const editorRef = useRef<any>(null);
  const textareaId = `tinymce-editor-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    // Načítanie TinyMCE scriptu
    const loadTinyMCE = () => {
      if (window.tinymce) {
        initializeEditor();
        return;
      }

      // Načítanie TinyMCE z CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.tiny.cloud/1/rprmbak86jnp5brxy5pmsuid6ce819giawy9ost6xtfgtc6h/tinymce/7/tinymce.min.js';
      script.onload = () => {
        initializeEditor();
      };
      document.head.appendChild(script);
    };

    const initializeEditor = () => {
      window.tinymce.init({
        selector: `#${textareaId}`,
        height: height,
        menubar: true,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons',
          'template', 'codesample'
        ],
        toolbar: [
          'undo redo | formatselect | bold italic underline strikethrough | forecolor backcolor',
          'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent',
          'removeformat | link image media table | code fullscreen preview | help'
        ].join(' | '),
        content_style: `
          body { 
            font-family: var(--font-family-text, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif); 
            font-size: 14px; 
            background: var(--color-surface, #ffffff) !important;
            color: var(--color-text-primary, #374151) !important;
            margin: 8px;
            min-height: ${height - 100}px;
          }
          h1, h2, h3, h4, h5, h6 { 
            color: #1e293b; 
            margin-top: 1.5em; 
            margin-bottom: 0.5em; 
          }
          h1 { font-size: 2em; }
          h2 { font-size: 1.5em; }
          h3 { font-size: 1.25em; }
          p { margin-bottom: 1em; }
          a { color: #3b82f6; text-decoration: underline; }
          blockquote { 
            border-left: 4px solid #3b82f6; 
            padding-left: 1em; 
            margin: 1em 0; 
            font-style: italic; 
            color: #64748b; 
          }
          code { 
            background: #f3f4f6; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: 'Courier New', monospace; 
          }
          pre { 
            background: #1e293b; 
            color: #f8fafc; 
            padding: 1em; 
            border-radius: 8px; 
            overflow-x: auto; 
          }
          table { 
            width: 100%; 
            margin: 1em 0; 
          }
          table td, table th { 
            padding: 8px 12px; 
          }
          table th { 
            background: #f8fafc; 
            font-weight: bold; 
          }
          img { 
            max-width: 100%; 
            height: auto; 
            border-radius: 8px; 
          }

          /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          body {
            background: var(--color-surface, #1f2937) !important;
            color: var(--color-text-primary, #f9fafb) !important;
          }
        }
      `,
        
        skin: window.matchMedia('(prefers-color-scheme: oxide)').matches ? 'oxide-dark' : 'dark',
        placeholder: placeholder,
        branding: false,
        promotion: false,
        statusbar: true,
        resize: true,
        setup: (editor: any) => {
          editorRef.current = editor;
          
          // Event listenery
          editor.on('init', () => {
            editor.setContent(value || '');
            if (onInit) onInit();
          });

          editor.on('change', () => {
            const content = editor.getContent();
            onChange(content);
          });

          editor.on('keyup', () => {
            const content = editor.getContent();
            onChange(content);
          });

          editor.on('paste', () => {
            setTimeout(() => {
              const content = editor.getContent();
              onChange(content);
            }, 100);
          });
        },
        // Slovenské lokalizácie
        language: 'sk',
        language_url: 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6/langs/sk.js',
        
        // Nastavenia obrázkov
        image_advtab: true,
        image_caption: true,
        image_title: true,
        
        // Nastavenia linkov
        link_title: false,
        target_list: false,
        
        // Nastavenia tabuliek
        table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
        table_appearance_options: false,
        table_grid: false,
        table_cell_advtab: false,
        
        // Zakázanie drag&drop obrázkov (zatiaľ)
        paste_data_images: false,
        automatic_uploads: false,
        
        // Formáty
        formats: {
          alignleft: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-left' },
          aligncenter: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-center' },
          alignright: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-right' },
          alignjustify: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-justify' }
        },
        
        // Disabled stav
        readonly: disabled
      });
    };

    loadTinyMCE();

    // Cleanup
    return () => {
      if (editorRef.current) {
        window.tinymce.remove(`#${textareaId}`);
      }
    };
  }, [textareaId, height, placeholder, disabled]);

  // Update obsahu keď sa zmení value prop
  useEffect(() => {
    if (editorRef.current && editorRef.current.getContent() !== value) {
      editorRef.current.setContent(value || '');
    }
  }, [value]);

  return (
    <div style={{ marginBottom: '20px' }}>
      <textarea
        id={textareaId}
        defaultValue={value}
        style={{
          width: '100%',
          minHeight: `${height}px`,
          padding: '12px',
          fontFamily: 'inherit',
          fontSize: '14px',
          resize: 'vertical'
        }}
      />
    </div>
  );
};

export default RichTextEditor;