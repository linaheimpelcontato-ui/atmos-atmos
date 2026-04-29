import { MessageCircle } from "lucide-react";

interface WhatsAppPhoneProps {
  phone: string | null | undefined;
  className?: string;
}

export default function WhatsAppPhone({ phone, className }: WhatsAppPhoneProps) {
  if (!phone) return <span className="text-muted-foreground">—</span>;

  const digits = phone.replace(/\D/g, "");
  if (!digits) return <span className="text-muted-foreground">{phone}</span>;

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-primary hover:underline cursor-pointer text-left ${className ?? ""}`}
      title="Abrir conversa no WhatsApp"
    >
      <MessageCircle className="h-3 w-3 shrink-0" />
      {phone}
    </a>
  );
}
