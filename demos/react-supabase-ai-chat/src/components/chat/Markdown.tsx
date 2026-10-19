import { cn } from '@/library/cn';
import { Check, Copy } from 'lucide-react';
import React from 'react';
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCopyToClipboard } from './useCopyToClipboard';

const components: Components = { pre: CodeBlock };

export function Markdown({ children, streaming }: { children: string; streaming?: boolean }) {
  return (
    <div
      className={cn(
        'prose max-w-none text-[15px] leading-7 text-ink dark:prose-invert',
        'prose-headings:font-semibold prose-headings:text-ink prose-strong:text-ink prose-a:text-brand',
        'prose-code:rounded prose-code:bg-bubble prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:text-ink prose-code:before:content-none prose-code:after:content-none',
        streaming && 'streaming'
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** A fenced code block, with its language and a copy button above the code. */
function CodeBlock({ node, children }: React.ComponentProps<'pre'> & ExtraProps) {
  const { copied, copy } = useCopyToClipboard();
  const { language, source } = readCode(node);

  return (
    <div className="not-prose my-5 overflow-hidden rounded-xl bg-stone-900 text-stone-100 first:mt-0 last:mb-0 dark:bg-black/40">
      <div className="flex items-center justify-between py-1 pr-1.5 pl-4 text-xs text-stone-400">
        <span>{language ?? 'code'}</span>
        <button
          type="button"
          onClick={() => copy(source)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/10 hover:text-stone-100"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 pb-4 text-[13px] leading-6">{children}</pre>
    </div>
  );
}

/** Reads the language and source of a code block from the `<code>` element inside its `<pre>`. */
function readCode(pre: ExtraProps['node']) {
  const code = pre?.children[0];
  if (code?.type !== 'element') return { language: undefined, source: '' };

  return {
    language: /language-([^\s,]+)/.exec(String(code.properties.className))?.[1],
    source: code.children
      .map((child) => (child.type === 'text' ? child.value : ''))
      .join('')
      .replace(/\n$/, '')
  };
}
