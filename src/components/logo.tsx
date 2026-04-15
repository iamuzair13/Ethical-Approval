import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-8 w-[10.847rem]">
      <Image
        src="/images/logo/logo.svg"
        fill
        className="object-contain object-left dark:hidden"
        alt="IREB Board"
        role="presentation"
        priority
      />

      <Image
        src="/images/logo/logo-dark.svg"
        fill
        className="hidden object-contain object-left dark:block"
        alt="IREB Board"
        role="presentation"
        priority
      />
    </div>
  );
}
