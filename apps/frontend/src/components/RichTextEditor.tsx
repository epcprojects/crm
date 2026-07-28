'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import clsx from 'clsx';

// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  BoldIcon,
  CommaEndIcon,
  CommaStartIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  StrokeIcon,
  UnderlineIcon,
  UnorderedListIcon,
} from 'apps/frontend/public/icons';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;

  name?: string;
  label?: string;
  placeholder?: string;
  errorText?: string;
  maxLength?: number;

  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;

  showToolbar?: boolean;
  showCharacterCount?: boolean;

  editorHeight?: string;
  className?: string;
  editorClassName?: string;
};

type ToolbarButtonProps = {
  children: ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolbarButton({
  children,
  title,
  active = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();

        if (!disabled) {
          onClick();
        }
      }}
      className={clsx(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-sm',
        'transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-35',
        active
          ? 'bg-gray-100 text-gray-900'
          : 'bg-white text-gray-900 hover:bg-gray-100',
      )}
    >
      {children}
    </button>
  );
}

function EditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled: boolean;
}) {
  const toolbarState = useEditorState({
    editor,

    selector: ({ editor: currentEditor }) => ({
      isBold: currentEditor.isActive('bold'),
      isItalic: currentEditor.isActive('italic'),
      isUnderline: currentEditor.isActive('underline'),
      isStrike: currentEditor.isActive('strike'),
      isOrderedList: currentEditor.isActive('orderedList'),
      isBulletList: currentEditor.isActive('bulletList'),
      isLink: currentEditor.isActive('link'),
    }),
  });

  const handleLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;

    const url = window.prompt(
      toolbarState.isLink
        ? 'Edit URL. Leave empty to remove the link.'
        : 'Enter URL',
      previousUrl ?? 'https://',
    );

    if (url === null) {
      return;
    }

    const normalizedUrl = url.trim();

    if (!normalizedUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();

      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: normalizedUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
      })
      .run();
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white p-1">
      <ToolbarButton
        title="Bold"
        active={toolbarState.isBold}
        disabled={disabled}
        onClick={() => {
          editor.chain().focus().toggleBold().run();
        }}
      >
        <BoldIcon />
      </ToolbarButton>

      <ToolbarButton
        title="Italic"
        active={toolbarState.isItalic}
        disabled={disabled}
        onClick={() => {
          editor.chain().focus().toggleItalic().run();
        }}
      >
        <ItalicIcon />
      </ToolbarButton>

      <ToolbarButton
        title="Underline"
        active={toolbarState.isUnderline}
        disabled={disabled}
        onClick={() => {
          editor.chain().focus().toggleUnderline().run();
        }}
      >
        <UnderlineIcon />
      </ToolbarButton>

      <ToolbarButton
        title="Strikethrough"
        active={toolbarState.isStrike}
        disabled={disabled}
        onClick={() => {
          editor.chain().focus().toggleStrike().run();
        }}
      >
        <StrokeIcon />
      </ToolbarButton>

      <ToolbarButton
        title="Insert opening quote"
        disabled={disabled}
        onClick={() => {
          editor.chain().focus().insertContent('\u201C').run();
        }}
      >
        <CommaStartIcon />
      </ToolbarButton>

      <ToolbarButton
        title="Insert closing quote"
        disabled={disabled}
        onClick={() => {
          editor.chain().focus().insertContent('\u201D').run();
        }}
      >
        <CommaEndIcon />
      </ToolbarButton>

      <ToolbarButton
        title="Ordered list"
        active={toolbarState.isOrderedList}
        disabled={disabled}
        onClick={() => {
          editor.chain().focus().toggleOrderedList().run();
        }}
      >
        <OrderedListIcon />
      </ToolbarButton>

      <ToolbarButton
        title="Unordered list"
        active={toolbarState.isBulletList}
        disabled={disabled}
        onClick={() => {
          editor.chain().focus().toggleBulletList().run();
        }}
      >
        <UnorderedListIcon />
      </ToolbarButton>

      <ToolbarButton
        title={toolbarState.isLink ? 'Edit or remove link' : 'Add link'}
        active={toolbarState.isLink}
        disabled={disabled}
        onClick={handleLink}
      >
        <LinkIcon />
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  name,
  label,
  placeholder = 'Start typing...',
  errorText,
  maxLength,
  required = false,
  disabled = false,
  readOnly = false,
  showToolbar = true,
  showCharacterCount = true,
  editorHeight = 'h-30',
  className,
  editorClassName,
}: RichTextEditorProps) {
  const [characterCount, setCharacterCount] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled && !readOnly,

    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,

        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,

          HTMLAttributes: {
            class: 'text-primary underline underline-offset-2 cursor-pointer',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        },
      }),

      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),

      CharacterCount.configure({
        limit: maxLength ?? null,
        mode: 'textSize',
      }),
    ],

    content: value || '',

    editorProps: {
      attributes: {
        id: name ?? '',
        role: 'textbox',
        'aria-label': label ?? placeholder,
        'aria-invalid': errorText ? 'true' : 'false',

        class: clsx(
          'tiptap min-h-full w-full px-3.5 py-2',
          'text-sm font-medium text-gray-700 outline-none md:text-base',
          disabled && 'cursor-not-allowed',
          editorClassName,
        ),
      },
    },

    onCreate: ({ editor: currentEditor }) => {
      setCharacterCount(currentEditor.storage.characterCount.characters());
    },

    onUpdate: ({ editor: currentEditor }) => {
      setCharacterCount(currentEditor.storage.characterCount.characters());

      onChange(currentEditor.isEmpty ? '' : currentEditor.getHTML());
    },

    onBlur: () => {
      onBlur?.();
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = value || '';

    const currentValue = editor.isEmpty ? '' : editor.getHTML();

    if (nextValue === currentValue) {
      return;
    }

    editor.commands.setContent(nextValue, {
      emitUpdate: false,
    });

    setCharacterCount(editor.storage.characterCount.characters());
  }, [editor, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled && !readOnly);
  }, [editor, disabled, readOnly]);

  return (
    <div className={clsx('w-full', className)}>
      {label ? (
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base"
        >
          {label}

          {required ? <span className="ml-0.5 text-red-500">*</span> : null}
        </label>
      ) : null}

      <div
        className={clsx(
          'rich-text-editor flex flex-col overflow-hidden rounded-lg border bg-transparent',
          'transition focus-within:border-gray-400',
          errorText ? 'border-red-500' : 'border-gray-200',
          disabled && 'cursor-not-allowed bg-gray-100 opacity-70',
        )}
      >
        {editor && showToolbar && !readOnly ? (
          <EditorToolbar editor={editor} disabled={disabled} />
        ) : null}

        {editor ? (
          <div
            className={clsx(
              'rich-text-scroll-area shrink-0 overflow-y-auto overscroll-contain',
              editorHeight,
            )}
          >
            <EditorContent editor={editor} />
          </div>
        ) : (
          <div className={clsx('w-full shrink-0 px-3.5 py-2', editorHeight)} />
        )}
      </div>

      {errorText || (showCharacterCount && maxLength !== undefined) ? (
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-xs text-red-600">{errorText || ''}</p>

          {showCharacterCount && maxLength !== undefined ? (
            <p
              className={clsx(
                'shrink-0 text-xs',
                characterCount >= maxLength ? 'text-red-600' : 'text-gray-500',
              )}
            >
              {characterCount}/{maxLength}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
