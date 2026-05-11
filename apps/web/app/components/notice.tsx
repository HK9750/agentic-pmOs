import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type NoticeProps = {
  title: string;
  message: string;
  variant?: "default" | "destructive";
};

export function Notice({ message, title, variant = "default" }: NoticeProps) {
  return (
    <Alert variant={variant}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
