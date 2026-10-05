import { CheckCircleIcon } from "./icons";

type FormAlertProps = {
  tone: "success" | "error";
  children: React.ReactNode;
};

export function FormAlert({ tone, children }: FormAlertProps) {
  if (tone === "success") {
    return (
      <div role="status" className="mb-5 flex items-center gap-2.5 rounded-[10px] border border-green/30 bg-green/10 px-3.5 py-3">
        <CheckCircleIcon className="h-[18px] w-[18px] flex-shrink-0 text-green" />
        <span className="text-[13.5px] font-medium text-green-dark">{children}</span>
      </div>
    );
  }

  return (
    <div role="alert" className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3">
      <span className="text-[13.5px] font-medium text-red-700">{children}</span>
    </div>
  );
}
