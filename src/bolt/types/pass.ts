export type PassType = 'generic' | 'onlineEvent';

export interface FileData {
  filename: string;
  base64: string;
}

export interface PassFormData {
  passType: PassType;
  title: string;
  subtitle: string;
  organization: string;
  backgroundColor: string;
  foregroundColor: string;
  logo: FileData | null;
  strip: FileData | null;
  serialNumber: string;
  description: string;
  relevantDate: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  message: string;
  errors?: FieldError[];
}

export type NotificationType = 'success' | 'error';

export interface Notification {
  type: NotificationType;
  message: string;
  fieldErrors?: FieldError[];
}

export const DEFAULT_FORM_DATA: PassFormData = {
  passType: 'generic',
  title: '',
  subtitle: '',
  organization: '',
  backgroundColor: '#0B1F3B',
  foregroundColor: '#FFFFFF',
  logo: null,
  strip: null,
  serialNumber: '',
  description: '',
  relevantDate: '',
};
