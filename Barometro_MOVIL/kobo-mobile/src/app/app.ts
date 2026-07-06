import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './theme.service';
import { TranslatePipe } from './translate.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  theme = inject(ThemeService);
  title = 'ULEAM';
}
