import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import {
  AUTH_REPOSITORY,
  REPORT_REPOSITORY,
  RESPONSE_REPOSITORY,
  SURVEY_REPOSITORY,
  USER_REPOSITORY,
} from './core/tokens/repository.tokens';
import { LocalAuthAdapter } from './data-access/adapters/local/local-auth.adapter';
import { LocalUserAdapter } from './data-access/adapters/local/local-user.adapter';
import { LocalSurveyAdapter } from './data-access/adapters/local/local-survey.adapter';
import { LocalResponseAdapter } from './data-access/adapters/local/local-response.adapter';
import { LocalReportAdapter } from './data-access/adapters/local/local-report.adapter';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor])),
    { provide: AUTH_REPOSITORY, useClass: LocalAuthAdapter },
    { provide: USER_REPOSITORY, useClass: LocalUserAdapter },
    { provide: SURVEY_REPOSITORY, useClass: LocalSurveyAdapter },
    { provide: RESPONSE_REPOSITORY, useClass: LocalResponseAdapter },
    { provide: REPORT_REPOSITORY, useClass: LocalReportAdapter },
  ],
};
