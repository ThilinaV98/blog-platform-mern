'use client';

import { Editor } from '@tiptap/react';
import { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Table,
  TableProperties,
  Plus,
  Trash2,
} from 'lucide-react';
import { MediaLibrary } from '@/components/upload/MediaLibrary';
import { UploadedImage } from '@/lib/api/upload';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  if (!editor) {
    return null;
  }

  const handleImageSelect = (image: UploadedImage) => {
    editor.chain().focus().setImage({ src: image.url }).run();
    setShowMediaLibrary(false);
  };

  const addImage = () => {
    setShowMediaLibrary(true);
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode; 
    title: string;
  }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
      }`}
      title={title}
      type="button"
    >
      {children}
    </button>
  );

  return (
    <>
    <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-t-lg bg-gray-50">
      <div className="flex gap-1 pr-2 border-r border-gray-300">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex gap-1 pr-2 border-r border-gray-300">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex gap-1 pr-2 border-r border-gray-300">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex gap-1 pr-2 border-r border-gray-300">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex gap-1 pr-2 border-r border-gray-300">
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={addImage}
          title="Add Image"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert Table"
        >
          <Table className="w-4 h-4" />
        </ToolbarButton>
        {editor.isActive('table') && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add Column"
            >
              <Plus className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete Column"
            >
              <Trash2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add Row"
            >
              <TableProperties className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete Row"
            >
              <Trash2 className="w-4 h-4 rotate-90" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Delete Table"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </ToolbarButton>
          </>
        )}
      </div>
    </div>

    {/* Media Library Modal */}
    {showMediaLibrary && (
      <MediaLibrary
        onSelect={handleImageSelect}
        onClose={() => setShowMediaLibrary(false)}
        multiple={false}
      />
    )}
  </>
  );
}