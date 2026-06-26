import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormQuestion } from '@core/services/form.service';
import { FormBuilderViewModel } from '@presentation/viewmodels/form-builder.viewmodel';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss',
  providers: [FormBuilderViewModel],
})
export class BuilderComponent implements OnInit {
  readonly vm = inject(FormBuilderViewModel);
  private readonly route = inject(ActivatedRoute);

  readonly questionTypes: Array<{
    value: FormQuestion['type'];
    labelKey: string;
    hintKey: string;
    icon: string;
  }> = [
    {
      value: 'SINGLE_CHOICE',
      labelKey: 'forms.builder.types.SINGLE_CHOICE',
      hintKey: 'forms.builder.hints.SINGLE_CHOICE',
      icon: 'radio_button_checked',
    },
    {
      value: 'MULTIPLE_CHOICE',
      labelKey: 'forms.builder.types.MULTIPLE_CHOICE',
      hintKey: 'forms.builder.hints.MULTIPLE_CHOICE',
      icon: 'checklist',
    },
    {
      value: 'LIKERT',
      labelKey: 'forms.builder.types.LIKERT',
      hintKey: 'forms.builder.hints.LIKERT',
      icon: 'linear_scale',
    },
    {
      value: 'TEXT',
      labelKey: 'forms.builder.types.TEXT',
      hintKey: 'forms.builder.hints.TEXT',
      icon: 'short_text',
    },
    {
      value: 'NUMBER',
      labelKey: 'forms.builder.types.NUMBER',
      hintKey: 'forms.builder.hints.NUMBER',
      icon: 'tag',
    },
  ];

  ngOnInit(): void {
    void this.vm.loadProjects();

    const formId = this.route.snapshot.paramMap.get('id');
    if (formId) {
      void this.vm.loadForm(formId);
    } else {
      this.vm.updateProject(this.route.snapshot.queryParamMap.get('project_id'));
    }
  }
}
