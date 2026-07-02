export interface CreateOrganizationInput {
    name: string;
    slug?: string;
}

export interface UpdateOrganizationInput {
    name?: string;
    slug?: string;
    logoUrl?: string;
}
