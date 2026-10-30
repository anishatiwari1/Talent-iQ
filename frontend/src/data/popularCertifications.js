// Suggestions for the "Add certification" form. Picking one fills in the
// issuer; employees can still type any certification not listed here.
export const POPULAR_CERTIFICATIONS = [
  // Cloud
  { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified Solutions Architect – Professional', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified Developer – Associate', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified SysOps Administrator – Associate', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified DevOps Engineer – Professional', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified Machine Learning – Specialty', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified Security – Specialty', issuer: 'Amazon Web Services' },
  { name: 'Microsoft Certified: Azure Fundamentals (AZ-900)', issuer: 'Microsoft' },
  { name: 'Microsoft Certified: Azure Administrator Associate (AZ-104)', issuer: 'Microsoft' },
  { name: 'Microsoft Certified: Azure Developer Associate (AZ-204)', issuer: 'Microsoft' },
  { name: 'Microsoft Certified: Azure Solutions Architect Expert (AZ-305)', issuer: 'Microsoft' },
  { name: 'Microsoft Certified: Azure Data Engineer Associate (DP-203)', issuer: 'Microsoft' },
  { name: 'Microsoft Certified: Azure AI Engineer Associate (AI-102)', issuer: 'Microsoft' },
  { name: 'Microsoft Certified: DevOps Engineer Expert (AZ-400)', issuer: 'Microsoft' },
  { name: 'Google Cloud Digital Leader', issuer: 'Google Cloud' },
  { name: 'Google Associate Cloud Engineer', issuer: 'Google Cloud' },
  { name: 'Google Professional Cloud Architect', issuer: 'Google Cloud' },
  { name: 'Google Professional Data Engineer', issuer: 'Google Cloud' },
  { name: 'Google Professional Machine Learning Engineer', issuer: 'Google Cloud' },
  // Containers & DevOps
  { name: 'Certified Kubernetes Administrator (CKA)', issuer: 'The Linux Foundation / CNCF' },
  { name: 'Certified Kubernetes Application Developer (CKAD)', issuer: 'The Linux Foundation / CNCF' },
  { name: 'Certified Kubernetes Security Specialist (CKS)', issuer: 'The Linux Foundation / CNCF' },
  { name: 'Docker Certified Associate (DCA)', issuer: 'Mirantis' },
  { name: 'HashiCorp Certified: Terraform Associate', issuer: 'HashiCorp' },
  { name: 'Red Hat Certified System Administrator (RHCSA)', issuer: 'Red Hat' },
  { name: 'Red Hat Certified Engineer (RHCE)', issuer: 'Red Hat' },
  { name: 'Linux Foundation Certified System Administrator (LFCS)', issuer: 'The Linux Foundation' },
  { name: 'GitHub Actions Certification', issuer: 'GitHub' },
  // Data & AI
  { name: 'TensorFlow Developer Certificate', issuer: 'Google' },
  { name: 'Databricks Certified Data Engineer Associate', issuer: 'Databricks' },
  { name: 'Databricks Certified Machine Learning Associate', issuer: 'Databricks' },
  { name: 'SnowPro Core Certification', issuer: 'Snowflake' },
  { name: 'Microsoft Certified: Power BI Data Analyst Associate (PL-300)', issuer: 'Microsoft' },
  { name: 'Tableau Desktop Specialist', issuer: 'Tableau (Salesforce)' },
  { name: 'Google Data Analytics Professional Certificate', issuer: 'Google (Coursera)' },
  { name: 'IBM Data Science Professional Certificate', issuer: 'IBM (Coursera)' },
  { name: 'Deep Learning Specialization', issuer: 'DeepLearning.AI (Coursera)' },
  { name: 'Machine Learning Specialization', issuer: 'DeepLearning.AI & Stanford (Coursera)' },
  // Databases & languages
  { name: 'Oracle Certified Professional: Java SE 17 Developer', issuer: 'Oracle' },
  { name: 'Oracle Database SQL Certified Associate', issuer: 'Oracle' },
  { name: 'MongoDB Associate Developer', issuer: 'MongoDB' },
  { name: 'PCEP – Certified Entry-Level Python Programmer', issuer: 'Python Institute' },
  { name: 'PCAP – Certified Associate in Python Programming', issuer: 'Python Institute' },
  { name: 'Meta Front-End Developer Professional Certificate', issuer: 'Meta (Coursera)' },
  { name: 'Meta Back-End Developer Professional Certificate', issuer: 'Meta (Coursera)' },
  // Security
  { name: 'CompTIA Security+', issuer: 'CompTIA' },
  { name: 'CompTIA Network+', issuer: 'CompTIA' },
  { name: 'CompTIA A+', issuer: 'CompTIA' },
  { name: 'Certified Information Systems Security Professional (CISSP)', issuer: 'ISC2' },
  { name: 'Certified in Cybersecurity (CC)', issuer: 'ISC2' },
  { name: 'Certified Ethical Hacker (CEH)', issuer: 'EC-Council' },
  { name: 'Certified Information Security Manager (CISM)', issuer: 'ISACA' },
  // Project management & agile
  { name: 'Project Management Professional (PMP)', issuer: 'Project Management Institute' },
  { name: 'Certified Associate in Project Management (CAPM)', issuer: 'Project Management Institute' },
  { name: 'PMI Agile Certified Practitioner (PMI-ACP)', issuer: 'Project Management Institute' },
  { name: 'Professional Scrum Master I (PSM I)', issuer: 'Scrum.org' },
  { name: 'Professional Scrum Product Owner I (PSPO I)', issuer: 'Scrum.org' },
  { name: 'Certified ScrumMaster (CSM)', issuer: 'Scrum Alliance' },
  { name: 'PRINCE2 Foundation', issuer: 'PeopleCert (AXELOS)' },
  { name: 'ITIL 4 Foundation', issuer: 'PeopleCert (AXELOS)' },
  { name: 'Google Project Management Professional Certificate', issuer: 'Google (Coursera)' },
  // Design
  { name: 'Google UX Design Professional Certificate', issuer: 'Google (Coursera)' },
  { name: 'Certified Usability Analyst (CUA)', issuer: 'Human Factors International' },
];

export const searchCertifications = (query, limit = 8) => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return POPULAR_CERTIFICATIONS
    .filter((cert) => {
      const text = `${cert.name} ${cert.issuer}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .slice(0, limit);
};
