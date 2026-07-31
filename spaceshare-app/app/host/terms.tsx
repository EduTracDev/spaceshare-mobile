import LegalDocScreen from '@/components/screens/LegalDocScreen';

const PARAGRAPHS = [
  'At our company, we prioritize your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data. We gather information when you interact with our services, including but not limited to your name, email address, and usage data. This information helps us enhance your experience and provide tailored services.',
  'We may use your data for various purposes, such as improving our website, sending you updates, and analyzing usage trends. We ensure that your information is stored securely and only accessible to authorized personnel.',
  'You have the right to access, modify, or delete your personal information at any time. We also encourage you to review our policy regularly, as we may update it to reflect changes in our practices or applicable laws.',
  'If you have any questions or concerns about our Privacy Policy, please do not hesitate to contact us. Your trust is important to us, and we are dedicated to maintaining the confidentiality of your information.',
];

export default function HostTermsOfUse() {
  return (
    <LegalDocScreen
      title="Terms of Use"
      updatedDate="11-June-2026"
      paragraphs={PARAGRAPHS}
    />
  );
}