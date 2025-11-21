import { useTranslations } from "next-intl";
export default function Page() {
const t = useTranslations("home-page");

  return (
    <div className="font-cal -mt-16 flex  min-h-screen w-screen items-center justify-center border pt-16 text-center ">
      <div>
        <h1 className="text-7xl leading-none md:text-8xl">{t('hero.heading.line-one')}<br />{t('hero.heading.line-two')}</h1>
      </div>
    </div>
  );
}
