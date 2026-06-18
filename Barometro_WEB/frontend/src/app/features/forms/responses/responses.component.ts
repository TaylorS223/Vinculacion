import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BarChartComponent } from '@presentation/components/charts/bar-chart.component';
import { PieChartComponent } from '@presentation/components/charts/pie-chart.component';
import { FormResponsesViewModel } from '@presentation/viewmodels/form-responses.viewmodel';

@Component({
  selector: 'app-form-responses',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    BarChartComponent,
    PieChartComponent,
  ],
  templateUrl: './responses.component.html',
  styleUrl: './responses.component.scss',
  providers: [FormResponsesViewModel],
})
export class ResponsesComponent implements OnInit {
  readonly vm = inject(FormResponsesViewModel);
  private readonly route = inject(ActivatedRoute);

  displayedColumns: string[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    void this.vm.load(id).then(() => {
      this.displayedColumns = this.vm.tableColumns().map((column) => column.key);
    });
  }
}
