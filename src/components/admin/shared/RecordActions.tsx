import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/admin/ui';

interface RecordActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

/** Edit and Delete for one row, the same on every list. */
const RecordActions = ({ onEdit, onDelete, isDeleting }: RecordActionsProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button size="sm" variant="danger" onClick={onDelete} disabled={isDeleting}>
        <Trash2 className="h-3.5 w-3.5" />
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
};

export default RecordActions;
