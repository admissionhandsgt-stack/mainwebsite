
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'checkbox';
  required?: boolean;
}

interface RecordFormProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isLoading: boolean;
  isEditing: boolean;
}

const RecordForm = ({
  fields,
  values,
  onChange,
  onSubmit,
  onCancel,
  isLoading,
  isEditing
}: RecordFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === 'textarea' ? (
            <Textarea
              id={field.name}
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={field.required}
            />
          ) : field.type === 'checkbox' ? (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.name}
                checked={values[field.name] || false}
                onCheckedChange={(checked) => 
                  onChange(field.name, checked)
                }
              />
              <Label htmlFor={field.name} className="cursor-pointer">
                {field.label}
              </Label>
            </div>
          ) : (
            <Input
              id={field.name}
              type={field.type}
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={field.required}
            />
          )}
        </div>
      ))}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : isEditing ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
};

export default RecordForm;
