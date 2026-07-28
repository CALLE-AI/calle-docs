import { forwardRef } from "react";
import { ClientOnly } from "zudoku/components";
import {
  ChevronDownIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "zudoku/icons";
import { useTheme } from "zudoku/hooks";
import { Button, type ButtonProps } from "zudoku/ui/Button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "zudoku/ui/DropdownMenu.js";

const themeOptions = [
  { value: "system", label: "System", Icon: MonitorIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
] as const;

type ThemeValue = (typeof themeOptions)[number]["value"];

type ThemeMenuProps = {
  className?: string;
  testId?: string;
};

type ThemeTriggerProps = ButtonProps & {
  selected: ThemeValue;
  testId?: string;
};

const ThemeTrigger = forwardRef<HTMLButtonElement, ThemeTriggerProps>(
  ({ selected, testId, ...props }, ref) => {
    const activeOption =
      themeOptions.find(({ value }) => value === selected) ?? themeOptions[0];
    const ActiveIcon = activeOption.Icon;

    return (
      <Button
        {...props}
        ref={ref}
        variant="outline"
        size="default"
        className="theme-menu__trigger"
        aria-label={`Theme: ${activeOption.label}. Change theme`}
        title={`Theme: ${activeOption.label}`}
        data-testid={testId}
        data-theme={selected}
      >
        <ActiveIcon aria-hidden="true" />
        <span className="theme-menu__label">{activeOption.label}</span>
        <ChevronDownIcon
          className="theme-menu__chevron"
          aria-hidden="true"
        />
      </Button>
    );
  },
);

ThemeTrigger.displayName = "ThemeTrigger";

const ThemeMenuClient = ({ testId }: Pick<ThemeMenuProps, "testId">) => {
  const { theme, setTheme } = useTheme();
  const selected: ThemeValue =
    theme === "light" || theme === "dark" ? theme : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ThemeTrigger selected={selected} testId={testId} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="theme-menu__content"
        aria-label="Theme"
      >
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selected}
          onValueChange={setTheme}
        >
          {themeOptions.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ThemeMenu = ({ className, testId }: ThemeMenuProps) => (
  <div className={["theme-menu", className].filter(Boolean).join(" ")}>
    <ClientOnly
      fallback={<ThemeTrigger selected="system" testId={testId} />}
    >
      <ThemeMenuClient testId={testId} />
    </ClientOnly>
  </div>
);
