interface OptiAuthData {
    provider: string;
    credentials: {
        token_type: string;
        access_token: string;
        org_sso_id: string;
        user_id: string;
        instance_id: string;
        customer_id: string;
        product_sku: string;
    };
}
export declare const getAssetFromCMP: (assetId: string, authData: OptiAuthData) => Promise<any>;
export {};
