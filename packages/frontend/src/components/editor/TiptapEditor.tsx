import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import {
  Box,
  IconButton,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  FormatListBulleted,
  FormatListNumbered,
  Link as LinkIcon,
  Image as ImageIcon,
  FormatClear,
  FormatColorText,
} from '@mui/icons-material';

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <Box
      sx={{
        p: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        alignItems: 'center',
      }}
    >
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <Select
          value={
            editor.isActive('heading', { level: 1 })
              ? '1'
              : editor.isActive('heading', { level: 2 })
              ? '2'
              : editor.isActive('heading', { level: 3 })
              ? '3'
              : '0'
          }
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
            }
          }}
          sx={{ height: 32 }}
        >
          <MenuItem value="0">Normal</MenuItem>
          <MenuItem value="1">Heading 1</MenuItem>
          <MenuItem value="2">Heading 2</MenuItem>
          <MenuItem value="3">Heading 3</MenuItem>
        </Select>
      </FormControl>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Bold">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive('bold') ? 'primary' : 'default'}
          >
            <FormatBold fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Italic">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive('italic') ? 'primary' : 'default'}
          >
            <FormatItalic fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Underline">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            color={editor.isActive('underline') ? 'primary' : 'default'}
          >
            <FormatUnderlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Strikethrough">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            color={editor.isActive('strike') ? 'primary' : 'default'}
          >
            <StrikethroughS fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Bullet List">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            color={editor.isActive('bulletList') ? 'primary' : 'default'}
          >
            <FormatListBulleted fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Numbered List">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            color={editor.isActive('orderedList') ? 'primary' : 'default'}
          >
            <FormatListNumbered fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Add Link">
          <IconButton
            size="small"
            onClick={addLink}
            color={editor.isActive('link') ? 'primary' : 'default'}
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add Image">
          <IconButton size="small" onClick={addImage}>
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title="Clear Formatting">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <FormatClear fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default function TiptapEditor({ value, onChange, minHeight = 400 }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when value prop changes externally
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        '& .ProseMirror': {
          minHeight: minHeight,
          padding: 2,
          outline: 'none',
          '& p': {
            margin: '0 0 0.5em 0',
          },
          '& h1': {
            fontSize: '2em',
            fontWeight: 600,
            margin: '0.67em 0',
          },
          '& h2': {
            fontSize: '1.5em',
            fontWeight: 600,
            margin: '0.75em 0',
          },
          '& h3': {
            fontSize: '1.17em',
            fontWeight: 600,
            margin: '0.83em 0',
          },
          '& ul, & ol': {
            paddingLeft: '1.5em',
          },
          '& a': {
            color: '#667EEA',
            textDecoration: 'underline',
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto',
          },
          '&:focus': {
            outline: 'none',
          },
        },
      }}
    >
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </Box>
  );
}
