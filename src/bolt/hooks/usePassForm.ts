import { useState, useCallback } from 'react';
import type { PassFormData, Notification, ApiErrorResponse } from '../types/pass';
import { DEFAULT_FORM_DATA } from '../types/pass';
import { generatePass } from '../utils/api';

export default function usePassForm() {
  const [formData, setFormData] = useState<PassFormData>({ ...DEFAULT_FORM_DATA });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const updateField = useCallback(<K extends keyof PassFormData>(
    key: K,
    value: PassFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA });
    setNotification(null);
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const submit = useCallback(async () => {
    if (!formData.title.trim()) {
      setNotification({
        type: 'error',
        message: 'Validation failed',
        fieldErrors: [{ field: 'title', message: 'Title is required' }],
      });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      await generatePass(formData);
      setNotification({
        type: 'success',
        message: 'Pass generated. Download started.',
      });
    } catch (err) {
      const apiErr = err as ApiErrorResponse;
      setNotification({
        type: 'error',
        message: apiErr.message || 'Something went wrong',
        fieldErrors: apiErr.errors,
      });
    } finally {
      setLoading(false);
    }
  }, [formData]);

  return {
    formData,
    loading,
    notification,
    updateField,
    reset,
    submit,
    dismissNotification,
  };
}
