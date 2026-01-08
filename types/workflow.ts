// types/workflow.ts
export interface WorkflowI {
  _id: string;
  title: string;
  description: string;
  // workflowType: string;
  category?: string;
  subcategory?: string;
  subsubcategory?: string;
  hitCount?: number;
  prompt: string;
  uploadRequired: boolean;
  citation?: boolean;  // ✅ Enable/disable citation display for this workflow
  grounding?: boolean;  // ✅ Enable/disable grounding for this workflow
  createdAt?: string;
  updatedAt?: string;
  isGeneral?:any;
}


export interface WorkflowIV2 {
  _id: string;
  title: string;
  description: string;
  workflowType: string;
  category?: string;
  subcategory?: string;
  subsubcategory?: string;
  hitCount?: number;
  prompt: string;
  uploadRequired: boolean;
  uploadDescription?: string;
  createdBy?: string;
  tgPublish?: boolean;
  model?: string;
  triggers?: string[];
  citation?: boolean;
  files?: string[];
  version?: number;
  rating?: {
    avgRating: number;
    count: number;
    totalRating: number;
  };
  createdAt?: string;
  updatedAt?: string;
  isGeneral?: any;
}

