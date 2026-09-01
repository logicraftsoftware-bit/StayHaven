import { PropertyWizard } from "@/components/owner/PropertyWizard";
export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PropertyWizard propertyId={id} />;
}
