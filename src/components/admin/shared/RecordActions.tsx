
import React from 'react';
import { Button } from '@/components/ui/button';

interface RecordActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

const RecordActions = ({ onEdit, onDelete, isDeleting }: RecordActionsProps) => {
  return (
    <div className="flex space-x-2">
      <Button
        size="sm"
        variant="outline"
        onClick={onEdit}
      >
        Edit
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={onDelete}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
};

export default RecordActions;
