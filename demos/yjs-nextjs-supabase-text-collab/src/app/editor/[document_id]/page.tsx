'use client';

import { usePowerSync, usePowerSyncWatchedQuery } from '@journeyapps/powersync-react';
import { Box, Container, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import MenuBar from '@/components/widgets/MenuBar';
import { PowerSyncYjsProvider } from '@/library/powersync/PowerSyncYjsProvider';
import Collaboration from '@tiptap/extension-collaboration';
import Highlight from '@tiptap/extension-highlight';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import * as Y from 'yjs';
import './tiptap-styles.scss';

export default function EditorPage({ params }: { params: { document_id: string } }) {
  const powerSync = usePowerSync();
  const documentId = params.document_id;

  // cache the last edited document ID in local storage
  if (window.localStorage.getItem('lastDocumentId') != documentId) {
    window.localStorage.setItem('lastDocumentId', documentId);
  }

  const [totalDocUpdates, setTotalDocUpdates] = useState(0);

  const ydoc = useMemo(() => {
    return new Y.Doc();
  }, [params.document_id]);

  useEffect(() => {
    const provider = new PowerSyncYjsProvider(ydoc, powerSync, documentId);
    return () => {
      provider.destroy();
    };
  }, [ydoc, powerSync]);

  // watch for total number of document updates changing to update the counter
  const docUpdatesCount = usePowerSyncWatchedQuery(
    'SELECT COUNT(*) as total_updates FROM document_updates WHERE document_id=?',
    [documentId]
  );
  useMemo(() => {
    if (docUpdatesCount.length > 0) setTotalDocUpdates(docUpdatesCount[0].total_updates);
  }, [docUpdatesCount]);

  // tiptap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false
      }),
      Highlight,
      TaskList,
      TaskItem,
      Collaboration.configure({
        document: ydoc
      })
    ]
  });

  return (
    <Container maxWidth="md" sx={{ mt: 5 }}>
      <Box>
        <h2>PowerSync Yjs CRDT Document Collaboration Demo</h2>
        <p>
          Edit text below and it will sync in to other users who have this page URL open in their browser. Conflicts are
          automatically resolved using CRDTs. Powered by{' '}
          <a href="https://github.com/yjs/yjs" target="_blank">
            Yjs
          </a>{' '}
          and{' '}
          <a href="https://tiptap.dev/" target="_blank">
            Tiptap
          </a>
          .
        </p>
      </Box>
      <div className="editor">
        {editor && <MenuBar editor={editor} />}
        <EditorContent className="editor__content" editor={editor} />
      </div>
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" display="block" gutterBottom>
          {totalDocUpdates} total edit(s) in this document.
        </Typography>
      </Box>
    </Container>
  );
}
