'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useEffect } from 'react';
import { EditorToolbar } from './EditorToolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Start writing...',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 hover:text-primary-700 underline',
        },
      }),
      CharacterCount.configure({
        mode: 'textSize',
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-fixed w-full',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 bg-gray-50 font-semibold p-2 text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none focus:outline-none ${className}`,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full">
      {editable && <EditorToolbar editor={editor} />}
      <div className={`relative min-h-[400px] w-full rounded-lg border ${
        editable ? 'border-gray-300 bg-white' : 'border-transparent'
      }`}>
        <EditorContent
          editor={editor}
          className="min-h-[400px] p-4"
          placeholder={placeholder}
        />
        {editable && !editor.getText() && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
      {editable && (
        <div className="mt-2 flex justify-between text-sm text-gray-500">
          <span>
            {editor.storage.characterCount?.words() || 0} words
          </span>
          <span>
            {Math.ceil((editor.storage.characterCount?.words() || 0) / 200)} min read
          </span>
        </div>
      )}
    </div>
  );
}