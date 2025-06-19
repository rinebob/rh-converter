import { Injectable } from '@angular/core';
import { uniqueNamesGenerator, Config, adjectives, animals } from 'unique-names-generator';

const ANONYMOUS_NAME_KEY = 'anonymous_commenter_name';

@Injectable({
  providedIn: 'root'
})
export class AnonymousNameService {

  private customConfig: Config = {
    dictionaries: [adjectives, animals],
    separator: '_',
    style: 'lowerCase'
  };

  /**
   * Gets the stored anonymous name from local storage or generates a new one.
   * @returns The anonymous user name.
   */
  getName(): string {
    let name = localStorage.getItem(ANONYMOUS_NAME_KEY);
    if (!name) {
      name = uniqueNamesGenerator(this.customConfig);
      localStorage.setItem(ANONYMOUS_NAME_KEY, name);
    }
    return name;
  }
}