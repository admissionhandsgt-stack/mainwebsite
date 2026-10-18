import { Save } from 'lucide-react';
import { Button, Field, INPUT, INPUT_H, Toggle } from '@/components/admin/ui';

interface AlertFormData {
  id?: number;
  title: string;
  link: string;
  image_url: string;
  is_active: boolean;
  order_index: number;
}

interface AlertFormProps {
  alert: AlertFormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (field: string, value: string | number | boolean) => void;
  isEditing?: boolean;
  /** Optional: shows a Cancel button beside Save. */
  onCancel?: () => void;
}

const AlertForm = ({ alert, onSubmit, onChange, isEditing = false, onCancel }: AlertFormProps) => {
  // The add and edit panels can be open together, so their ids must not collide.
  const id = (name: string) => `${isEditing ? 'edit' : 'new'}-alert-${name}`;
  const input = `${INPUT} ${INPUT_H}`;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Alert text" htmlFor={id('title')} hint="One short line. It scrolls across the top of every page.">
        <input
          id={id('title')}
          value={alert.title}
          onChange={(e) => onChange('title', e.target.value)}
          required
          placeholder="e.g. MCC NEET PG Round 2 result declared"
          className={input}
        />
      </Field>

      <Field label="Link" htmlFor={id('link')} hint="Where a visitor goes when they tap the alert.">
        <input
          id={id('link')}
          value={alert.link}
          onChange={(e) => onChange('link', e.target.value)}
          required
          placeholder="https://..."
          className={input}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <Field label="Image link (optional)" htmlFor={id('image_url')}>
          <input
            id={id('image_url')}
            value={alert.image_url}
            onChange={(e) => onChange('image_url', e.target.value)}
            placeholder="https://..."
            className={input}
          />
        </Field>

        <Field label="Order" htmlFor={id('order')} hint="Lower comes first.">
          <input
            id={id('order')}
            type="number"
            value={alert.order_index}
            onChange={(e) => onChange('order_index', parseInt(e.target.value))}
            required
            className={`${input} tabular-nums`}
          />
        </Field>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Toggle
          checked={alert.is_active}
          onChange={(checked) => onChange('is_active', checked)}
          label={<span className="font-medium text-slate-900">Show on the site</span>}
        />
        <p className="mt-1.5 text-xs text-slate-500">Switch off to hide this alert without deleting it.</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary">
          <Save className="h-4 w-4" />
          {isEditing ? 'Save changes' : 'Publish alert'}
        </Button>
      </div>
    </form>
  );
};

export default AlertForm;
