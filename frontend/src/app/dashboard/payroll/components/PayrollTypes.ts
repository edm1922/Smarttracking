export interface PayrollRun {
  id: string;
  label?: string;
  client_name?: string;
  period_start: string;
  period_end: string;
  release_date?: string;
  created_at: string;
  _count?: {
    documents: number;
  };
}

export interface PayrollUser {
  id: string;
  fullName: string;
  username: string;
  sys_id: string;
  company_label?: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface PayrollRequest {
  id: string;
  userId: string;
  type: 'UPLOAD' | 'REVOKE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  clientName?: string;
  periodStart?: string;
  periodEnd?: string;
  releaseDate?: string;
  remark?: string;
  batchId?: string;
  user?: {
    username: string;
  };
  createdAt: string;
}
