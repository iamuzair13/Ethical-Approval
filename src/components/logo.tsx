import darkLogo from "/images/logo/UOL-Rebrand-ID_Final-01.png";
import logo from "/images/logo/UOL-Rebrand-ID_Final-01.png";
import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-8 max-w-[10.847rem]">
      <Image
        src={logo}
        fill
        className="dark:hidden"
        alt="IERB Board"
        role="presentation"
        quality={100}
      />

      <Image
        src={darkLogo}
        fill
        className="hidden dark:block"
        alt="IERB Board "
        role="presentation"
        quality={100}
      />
    </div>
  );
}
