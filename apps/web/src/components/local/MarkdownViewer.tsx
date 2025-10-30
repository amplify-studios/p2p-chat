'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import style from '@/app/md.module.css';

interface MarkdownViewerProps {
  content: string;
  inline?: boolean;
}

export default function MarkdownViewer({ content, inline = false }: MarkdownViewerProps) {
  return (
    <div className={style.md}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: ({ node, className, children, ...props }) => (
            <code
              className={`${className || ''} ${
                inline
                  ? ''
                  : 'block bg-[#0f172a] text-[#f8fafc] p-3 rounded-md overflow-x-auto'
              }`}
              {...props}
            >
              {children}
            </code>
          ),
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
