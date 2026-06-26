import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private lastSnapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();
    this.translate.onLangChange.subscribe(() => this.applyTitle());
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.lastSnapshot = snapshot;
    this.applyTitle();
  }

  private applyTitle(): void {
    if (!this.lastSnapshot) {
      return;
    }

    const titleKey = this.buildTitle(this.lastSnapshot);
    if (!titleKey) {
      return;
    }

    this.title.setTitle(this.translate.instant(titleKey));
  }
}
