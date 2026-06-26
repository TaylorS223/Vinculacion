import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormQuestion } from '@core/services/form.service';
import { FormBuilderViewModel } from '@presentation/viewmodels/form-builder.viewmodel';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss',
  providers: [FormBuilderViewModel],
})
export class BuilderComponent implements OnInit {
  readonly vm = inject(FormBuilderViewModel);
  private readonly route = inject(ActivatedRoute);

  readonly questionTypes: Array<{
    value: FormQuestion['type'];
    label: string;
    hint: string;
    icon: string;
  }> = [
    {
      value: 'SINGLE_CHOICE',
      label: 'Seleccion unica',
      hint: 'Una sola respuesta',
      icon: 'radio_button_checked',
    },
    {
      value: 'MULTIPLE_CHOICE',
      label: 'Seleccion multiple',
      hint: 'Varias respuestas',
      icon: 'checklist',
    },
    {
      value: 'LIKERT',
      label: 'Escala Likert',
      hint: 'Nivel de acuerdo',
      icon: 'linear_scale',
    },
    {
      value: 'TEXT',
      label: 'Texto',
      hint: 'Respuesta abierta',
      icon: 'short_text',
    },
    {
      value: 'NUMBER',
      label: 'Numero',
      hint: 'Valor numerico',
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
