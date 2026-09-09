import { redirect } from "next/navigation";

/** Legacy Training Forms builder now lives at the full Training Form Configurations workspace. */
export default function Page() {
  redirect("/training-form-configurations");
}
