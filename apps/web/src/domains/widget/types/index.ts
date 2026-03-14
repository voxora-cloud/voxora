export interface CreateWidgetData {
  _id?: string;
  displayName: string;
  backgroundColor: string;
  logoUrl: string;
  logoFileKey?: string;
}

export interface UpdateWidgetData {
  displayName?: string;
  backgroundColor?: string;
  logoUrl?: string;
}

export interface Widget extends CreateWidgetData {
  createdAt?: Date;
  updatedAt?: Date;
}


export interface WidgetResponse {
  success: boolean;
  data: Widget;
}
