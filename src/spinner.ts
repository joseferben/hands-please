import ora from "ora";

export const spinner = ora();

export function spin(text: string) {
  spinner.start();
  spinner.text = text;
}
