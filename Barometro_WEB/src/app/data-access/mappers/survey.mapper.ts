import { Survey } from '../../features/surveys/models/survey.model';

export function mapSurveyToDto(survey: Survey): Record<string, unknown> {
  return structuredClone(survey) as unknown as Record<string, unknown>;
}

export function mapDtoToSurvey(dto: Record<string, unknown>): Survey {
  return dto as unknown as Survey;
}
