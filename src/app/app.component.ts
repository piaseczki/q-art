import { Component } from '@angular/core';
import { Generator } from './generator/generator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Generator],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'q-art';
}
