import { Lifecycle as AppLifecycle, AuthorizationGrantResult, LifecycleResult, LifecycleSettingsResult, Request, SubmittedFormData } from '@zaiusinc/app-sdk';
export declare class Lifecycle extends AppLifecycle {
    onInstall(): Promise<LifecycleResult>;
    onSettingsForm(section: string, action: string, formData: SubmittedFormData): Promise<LifecycleSettingsResult>;
    onAuthorizationRequest(_section: string, _formData: SubmittedFormData): Promise<LifecycleSettingsResult>;
    onAuthorizationGrant(_request: Request): Promise<AuthorizationGrantResult>;
    onUpgrade(_fromVersion: string): Promise<LifecycleResult>;
    onFinalizeUpgrade(_fromVersion: string): Promise<LifecycleResult>;
    onAfterUpgrade(): Promise<LifecycleResult>;
    onUninstall(): Promise<LifecycleResult>;
}
