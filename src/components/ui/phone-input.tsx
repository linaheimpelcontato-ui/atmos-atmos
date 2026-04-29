import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const COUNTRY_CODES = [
  { code: "+55", label: "🇧🇷 +55", flag: "🇧🇷" },
  { code: "+1", label: "🇺🇸 +1", flag: "🇺🇸" },
  { code: "+54", label: "🇦🇷 +54", flag: "🇦🇷" },
  { code: "+595", label: "🇵🇾 +595", flag: "🇵🇾" },
  { code: "+598", label: "🇺🇾 +598", flag: "🇺🇾" },
  { code: "+56", label: "🇨🇱 +56", flag: "🇨🇱" },
  { code: "+51", label: "🇵🇪 +51", flag: "🇵🇪" },
  { code: "+57", label: "🇨🇴 +57", flag: "🇨🇴" },
  { code: "+58", label: "🇻🇪 +58", flag: "🇻🇪" },
  { code: "+591", label: "🇧🇴 +591", flag: "🇧🇴" },
  { code: "+593", label: "🇪🇨 +593", flag: "🇪🇨" },
  { code: "+52", label: "🇲🇽 +52", flag: "🇲🇽" },
  { code: "+351", label: "🇵🇹 +351", flag: "🇵🇹" },
  { code: "+34", label: "🇪🇸 +34", flag: "🇪🇸" },
  { code: "+33", label: "🇫🇷 +33", flag: "🇫🇷" },
  { code: "+39", label: "🇮🇹 +39", flag: "🇮🇹" },
  { code: "+49", label: "🇩🇪 +49", flag: "🇩🇪" },
  { code: "+44", label: "🇬🇧 +44", flag: "🇬🇧" },
  { code: "+41", label: "🇨🇭 +41", flag: "🇨🇭" },
  { code: "+31", label: "🇳🇱 +31", flag: "🇳🇱" },
  { code: "+32", label: "🇧🇪 +32", flag: "🇧🇪" },
  { code: "+353", label: "🇮🇪 +353", flag: "🇮🇪" },
  { code: "+46", label: "🇸🇪 +46", flag: "🇸🇪" },
  { code: "+47", label: "🇳🇴 +47", flag: "🇳🇴" },
  { code: "+45", label: "🇩🇰 +45", flag: "🇩🇰" },
  { code: "+358", label: "🇫🇮 +358", flag: "🇫🇮" },
  { code: "+48", label: "🇵🇱 +48", flag: "🇵🇱" },
  { code: "+43", label: "🇦🇹 +43", flag: "🇦🇹" },
  { code: "+30", label: "🇬🇷 +30", flag: "🇬🇷" },
  { code: "+7", label: "🇷🇺 +7", flag: "🇷🇺" },
  { code: "+81", label: "🇯🇵 +81", flag: "🇯🇵" },
  { code: "+82", label: "🇰🇷 +82", flag: "🇰🇷" },
  { code: "+86", label: "🇨🇳 +86", flag: "🇨🇳" },
  { code: "+91", label: "🇮🇳 +91", flag: "🇮🇳" },
  { code: "+61", label: "🇦🇺 +61", flag: "🇦🇺" },
  { code: "+64", label: "🇳🇿 +64", flag: "🇳🇿" },
  { code: "+972", label: "🇮🇱 +972", flag: "🇮🇱" },
  { code: "+971", label: "🇦🇪 +971", flag: "🇦🇪" },
  { code: "+27", label: "🇿🇦 +27", flag: "🇿🇦" },
];

function parsePhone(fullValue: string): { countryCode: string; ddd: string; number: string } {
  if (!fullValue) return { countryCode: "+55", ddd: "", number: "" };

  // Sort by length descending to match longest first
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  
  for (const c of sorted) {
    if (fullValue.startsWith(c.code)) {
      const rest = fullValue.slice(c.code.length);
      const digits = rest.replace(/\D/g, "");
      const ddd = digits.slice(0, 2);
      const number = digits.slice(2);
      return { countryCode: c.code, ddd, number };
    }
  }

  // No match, assume +55
  const digits = fullValue.replace(/\D/g, "");
  return { countryCode: "+55", ddd: digits.slice(0, 2), number: digits.slice(2) };
}

function formatNumber(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 9);
  if (clean.length <= 4) return clean;
  if (clean.length <= 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

interface PhoneInputProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const PhoneInput = React.forwardRef<HTMLDivElement, PhoneInputProps>(
  ({ value, onChange, className, disabled, ...props }, ref) => {
    const parsed = parsePhone(value);
    const [localCountryCode, setLocalCountryCode] = React.useState(parsed.countryCode);
    const [localDdd, setLocalDdd] = React.useState(parsed.ddd);
    const [localNumber, setLocalNumber] = React.useState(formatNumber(parsed.number));

    // Sync with external value changes
    React.useEffect(() => {
      const p = parsePhone(value);
      setLocalCountryCode(p.countryCode);
      setLocalDdd(p.ddd);
      setLocalNumber(formatNumber(p.number));
    }, [value]);

    const emitChange = (cc: string, d: string, n: string) => {
      const dddDigits = d.replace(/\D/g, "");
      const numDigits = n.replace(/\D/g, "");
      onChange(`${cc}${dddDigits}${numDigits}`);
    };

    const handleCountryCodeChange = (newCode: string) => {
      setLocalCountryCode(newCode);
      emitChange(newCode, localDdd, localNumber);
    };

    const handleDddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      
      // Check if user pasted a full number
      if (raw.length > 4) {
        const parsed = parsePhone(raw);
        setLocalCountryCode(parsed.countryCode);
        setLocalDdd(parsed.ddd);
        setLocalNumber(formatNumber(parsed.number));
        emitChange(parsed.countryCode, parsed.ddd, formatNumber(parsed.number));
        return;
      }

      const digits = raw.replace(/\D/g, "").slice(0, 2);
      setLocalDdd(digits);
      emitChange(localCountryCode, digits, localNumber);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      
      // Check if user pasted a full number
      if (raw.replace(/\D/g, "").length > 11) {
        const parsed = parsePhone(raw);
        setLocalCountryCode(parsed.countryCode);
        setLocalDdd(parsed.ddd);
        setLocalNumber(formatNumber(parsed.number));
        emitChange(parsed.countryCode, parsed.ddd, formatNumber(parsed.number));
        return;
      }

      const formatted = formatNumber(raw);
      setLocalNumber(formatted);
      emitChange(localCountryCode, localDdd, formatted);
    };

    return (
      <div ref={ref} className={cn("flex gap-2", className)} {...props}>
        <Input
          type="text"
          value={localCountryCode}
          onChange={(e) => {
            let val = e.target.value.replace(/[^0-9+]/g, '');
            if (!val.startsWith('+') && val.length > 0) val = '+' + val;
            handleCountryCodeChange(val);
          }}
          disabled={disabled}
          className="w-20 text-center shrink-0"
          placeholder="+55"
          maxLength={4}
        />
        
        <Input
          type="tel"
          value={localDdd}
          onChange={handleDddChange}
          disabled={disabled}
          placeholder="11"
          className="w-16 text-center"
          maxLength={2}
        />
        
        <Input
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          disabled={disabled}
          placeholder="99999-9999"
          className="flex-1"
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
