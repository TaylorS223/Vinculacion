import { Pipe, PipeTransform } from '@angular/core';
import { SurveyStatus } from '../../features/surveys/models/survey.model';

@Pipe({
  name: 'formStatus',
})
export class FormStatusPipe implements PipeTransform {
  transform(value: SurveyStatus): string {
    if (value === 'DRAFT') {
      return 'Borrador';
    }

    if (value === 'IMPLEMENTED') {
      return 'Implementado';
    }

    return 'Archivado';
  }
}
