"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lifecycle = void 0;
const App = __importStar(require("@zaiusinc/app-sdk"));
const app_sdk_1 = require("@zaiusinc/app-sdk");
class Lifecycle extends app_sdk_1.Lifecycle {
    async onInstall() {
        try {
            app_sdk_1.logger.info('Performing Install');
            // write the generated webhook to the swell settings form
            const functionUrls = await App.functions.getEndpoints();
            await App.storage.settings.put('instructions', {
                opal_tool_url: `${functionUrls.opal_tool}/discovery`,
            });
            /* example: initialize Google oauth section
            await storage.settings.patch('oauth', {
              authorized: false
            });
            */
            return { success: true };
        }
        catch (error) {
            app_sdk_1.logger.error('Error during installation:', error);
            return {
                success: false,
                retryable: true,
                message: `Error during installation: ${error}`,
            };
        }
    }
    async onSettingsForm(section, action, formData) {
        const result = new app_sdk_1.LifecycleSettingsResult();
        try {
            // TODO: any logic you need to perform when a setup form section is submitted
            // When you are finished, save the form data to the settings store
            if (section === 'bearer_token') {
                if (action === 'save_token') {
                    await app_sdk_1.storage.settings.put(section, formData);
                }
            }
            /*
             * example of handling username/password auth section
             *
            if (section === 'auth' && action === 'authorize') {
              await storage.settings.put<AuthSection>(section, {...formData, integrated: true});
      
              // validate the credentials here, e.g. by making an API call
              const success = true; // replace with actual validation logic
      
              if (success) {
                result.addToast('success', 'Validation successful!');
              } else {
                result.addToast('warning', 'Your credentials were not accepted. Please check them and try again.');
              }
            } else {
              result.addToast('warning', 'Unexpected action received.');
            }
            */
            return result;
        }
        catch (_a) {
            return result.addToast('danger', 'Sorry, an unexpected error occurred. Please try again in a moment.');
        }
    }
    async onAuthorizationRequest(_section, _formData) {
        // example: handling OAuth authorization request
        const result = new app_sdk_1.LifecycleSettingsResult();
        /* example: handling OAuth authorization request
        try {
          const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
          url.search = new URLSearchParams({
            client_id: process.env.APP_ENV_CLIENT_ID,
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
            scope: process.env.APP_ENV_SCOPE,
            redirect_uri: functions.getAuthorizationGrantUrl()
          } as any).toString();
          return result.redirect(url.toString());
        } catch (e) {
          return result.addToast(
            'danger',
            'Sorry, an unexpected error occurred. Please try again in a moment.',
          );
        }
        */
        return result.addToast('danger', 'Sorry, OAuth is not supported.');
    }
    async onAuthorizationGrant(_request) {
        /* example: handling OAuth authorization grant
    
        // make sure to add CLIENT_ID, CLIENT_SECRET, and DEVELOPER_TOKEN to your .env file
        const CLIENT_ID = process.env.APP_ENV_CLIENT_ID || '';
        const CLIENT_SECRET = process.env.APP_ENV_CLIENT_SECRET || '';
    
        const result = new AuthorizationGrantResult('');
        try {
          await storage.settings.patch('auth', {
            authorized: false
          });
          const request = {
            method: 'POST',
            body: JSON.stringify({
              client_id: CLIENT_ID,
              client_secret: CLIENT_SECRET,
              grant_type: 'authorization_code',
              redirect_uri: functions.getAuthorizationGrantUrl(),
              code: _request.params.code as string
            }),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          };
    
          let token: Token | undefined;
          const response = await fetch('https://oauth2.googleapis.com/token', request);
          switch (response.status) {
          case 200:
            const rawToken = await response.json() as any;
            token = {
              value: rawToken.access_token,
              refresh: rawToken.refresh_token,
              exp: Date.now() + (rawToken.expires_in - 60) * 1000
            };
            await storage.secrets.put('token', token);
            break;
          case 401:
            logger.error('Unauthorized, invalid credentials.');
            break;
          default:
            logger.error('General server error', response.status, await response.text());
            throw new Error('API Call Issue');
          }
          if (token) {
            result.addToast('success', 'Successfully authorized!');
            await storage.settings.patch('auth', {authorized: true});
          }
        } catch (e) {
          logger.error(e);
          return result.addToast('danger', 'Sorry, OAuth is not supported.');
        }
        */
        return new app_sdk_1.AuthorizationGrantResult('').addToast('danger', 'Sorry, OAuth is not supported.');
    }
    async onUpgrade(_fromVersion) {
        // TODO: any logic required when upgrading from a previous version of the app
        // Note: `fromVersion` may not be the most recent version or could be a beta version
        // write the generated webhook to the swell settings form
        const functionUrls = await App.functions.getEndpoints();
        await App.storage.settings.put('instructions', {
            opal_tool_url: `${functionUrls.opal_tool}/discovery`
        });
        return { success: true };
    }
    async onFinalizeUpgrade(_fromVersion) {
        // TODO: any logic required when finalizing an upgrade from a previous version
        // At this point, new webhook URLs have been created for any new functions in this version
        return { success: true };
    }
    async onAfterUpgrade() {
        // TODO: any logic required after the upgrade has been completed.  This is the plugin point
        // for triggering one-time jobs against the upgraded installation
        return { success: true };
    }
    async onUninstall() {
        // TODO: any logic required to properly uninstall the app
        return { success: true };
    }
}
exports.Lifecycle = Lifecycle;
//# sourceMappingURL=Lifecycle.js.map