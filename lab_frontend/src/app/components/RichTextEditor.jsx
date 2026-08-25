import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import DOMPurify from "dompurify";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Table as TableIcon,
  Quote,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";
import "./RichTextEditor.css";

// TipTap v2. StarterKit already provides bold/italic/strike/headings/lists/
// blockquote/hr/history; underline and tables are separate extensions.
const EXTENSIONS = [
  StarterKit,
  Underline,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
];

// The report is authored in a controlled toolbar, but it is stored as raw HTML
// and later rendered with dangerouslySetInnerHTML / inside the Puppeteer PDF.
// Sanitise to exactly the tags the editor can emit so a hand-crafted API call
// can't smuggle scripts into a rendered report.
const SANITIZE_OPTS = {
  ALLOWED_TAGS: [
    "p", "br", "span", "strong", "b", "em", "i", "u", "s", "strike",
    "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "code", "pre", "hr",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  ALLOWED_ATTR: ["colspan", "rowspan"],
};

export function sanitizeReportHtml(html) {
  return DOMPurify.sanitize(html || "", SANITIZE_OPTS);
}

/** Read-only render of stored report HTML (Lab Admin review + submitted view). */
export function RichTextContent({ html, className = "" }) {
  return (
    <div
      className={`rte-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(html) }}
    />
  );
}

function ToolbarBtn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection/focus
      onClick={onClick}
      disabled={disabled}
      className={`h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded-md border text-xs font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Word-like report editor. Controlled by `value` (HTML) / `onChange(html)`.
 * Mount one per report and give it a stable `key` so switching reports
 * remounts with the right content rather than fighting the caret.
 */
export function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value || "",
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: { class: "rte-content rte-input" },
    },
  });

  // Pull in an externally-changed value (e.g. a freshly loaded draft) but never
  // while the user is mid-edit, to avoid yanking the caret.
  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    if (next !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(next, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const inTable = editor.isActive("table");

  return (
    <div className="rte-wrapper rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
        <ToolbarBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-4 h-4" />
        </ToolbarBtn>

        <span className="w-px h-5 bg-border mx-0.5" />

        <ToolbarBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </ToolbarBtn>

        <span className="w-px h-5 bg-border mx-0.5" />

        <ToolbarBtn
          title="Insert table"
          active={inTable}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon className="w-4 h-4" />
        </ToolbarBtn>
        {inTable && (
          <>
            <ToolbarBtn title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</ToolbarBtn>
            <ToolbarBtn title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>+Row</ToolbarBtn>
            <ToolbarBtn title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>−Col</ToolbarBtn>
            <ToolbarBtn title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>−Row</ToolbarBtn>
            <ToolbarBtn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>✕Tbl</ToolbarBtn>
          </>
        )}

        <span className="w-px h-5 bg-border mx-0.5" />

        <ToolbarBtn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="w-4 h-4" />
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;
