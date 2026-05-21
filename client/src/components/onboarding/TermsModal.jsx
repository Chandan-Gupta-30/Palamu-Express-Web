import { useState } from "react";
import { X } from "lucide-react";

export const termsData = {
  en: {
    title: "PALAMU EXPRESS DIGITAL MEDIA",
    subtitle: "Terms & Conditions Agreement",
    reporterAgreement: "Reporter, Contributor & Chief Editor Agreement",
    effectiveDate: "Effective Date",
    jurisdiction: "Jurisdiction",
    websites: "Websites",
    sections: [
      {
        title: "1. INTRODUCTION",
        content: [
          "This Terms & Conditions Agreement (“Agreement”) governs the onboarding, access, and use of the Palamu Express digital news platform (“Platform”) by reporters, contributors, chief editors, and associated media personnel (“User”).",
          "By registering, accessing, or publishing content on Palamu Express, the User agrees to comply with all terms mentioned herein."
        ]
      },
      {
        title: "2. ABOUT THE PLATFORM",
        content: [
          "Palamu Express is a hyper-local digital news and media platform focused on delivering reliable, verified, and community-centered news coverage from Jharkhand and nearby regions.",
          "The Platform enables:"
        ],
        bullets: [
          "News reporting",
          "Editorial review",
          "Digital publishing",
          "Public information dissemination",
          "Hyper-local journalism and media operations"
        ]
      },
      {
        title: "3. USER ELIGIBILITY",
        content: [
          "To use the Platform, the User must:"
        ],
        bullets: [
          "Be at least 18 years old",
          "Possess legal capacity to enter into agreements",
          "Provide accurate registration details",
          "Comply with Indian laws and media regulations",
          "Maintain professionalism and ethical conduct"
        ],
        postContent: "Palamu Express reserves the right to verify identity and credentials before approval."
      },
      {
        title: "4. ROLE & RESPONSIBILITIES",
        subsections: [
          {
            title: "4.1 Reporting Standards",
            content: "Users must ensure that all submitted news, articles, images, videos, and information are: factually accurate, properly verified, free from misinformation, and collected through lawful means."
          },
          {
            title: "4.2 Editorial Ethics",
            content: "Users shall: follow ethical journalism standards, avoid sensationalism and fake news, respect public sensitivity and privacy, and maintain neutrality in reporting where applicable."
          },
          {
            title: "4.3 Prohibited Activities",
            content: "Users shall NOT: publish false, defamatory, hateful, or misleading content; promote violence, communal hatred, or illegal activities; violate copyrights or intellectual property rights; impersonate officials or public authorities; upload obscene or unlawful material; or manipulate news for political or personal benefit without disclosure."
          }
        ]
      },
      {
        title: "5. CONTENT OWNERSHIP & LICENSE",
        content: [
          "Users retain ownership of their original content.",
          "By submitting content, Users grant Palamu Express a non-exclusive, royalty-free, worldwide license to: publish, edit, translate, promote, archive, and distribute the content across digital and social platforms.",
          "Palamu Express may modify formatting, headlines, grammar, or presentation for editorial purposes without changing the intended meaning."
        ]
      },
      {
        title: "6. FACT-CHECKING & MODERATION",
        content: [
          "All submitted content is subject to: editorial review, verification checks, and moderation approval.",
          "Palamu Express reserves the right to: reject any submission, remove published content, suspend publishing access, or request corrections or supporting evidence. Editorial decisions made by the Platform shall be final."
        ]
      },
      {
        title: "7. LEGAL & REGULATORY COMPLIANCE",
        content: [
          "Users agree to comply with: laws of India, Information Technology Act, 2000, Press Council of India guidelines, digital media and broadcasting regulations, and applicable state and district administrative orders.",
          "Any violation may result in: account suspension, legal reporting to authorities, or a permanent ban from the Platform."
        ]
      },
      {
        title: "8. PRIVACY & CONFIDENTIALITY",
        content: [
          "Palamu Express shall take reasonable steps to protect user information and unpublished editorial materials.",
          "Users must: maintain confidentiality of login credentials, protect unpublished or sensitive newsroom information, and avoid unauthorized sharing of internal communications. The Platform may disclose information when required by law or government authorities."
        ]
      },
      {
        title: "9. INTELLECTUAL PROPERTY",
        content: [
          "All logos, branding, software, layouts, designs, and platform assets belonging to Palamu Express are protected intellectual property.",
          "No User may: copy branding, create duplicate platforms, or use company identity without written permission."
        ]
      },
      {
        title: "10. PAYMENT & COMPENSATION (IF APPLICABLE)",
        content: [
          "Where compensation arrangements exist: payments shall be governed by separate written agreements; Palamu Express may withhold payments for policy violations, plagiarism, or fraudulent reporting; and no employment relationship is automatically created through onboarding unless specifically stated."
        ]
      },
      {
        title: "11. LIABILITY DISCLAIMER",
        content: [
          "Palamu Express acts as a publishing and media platform and shall not be solely liable for independently submitted User content.",
          "The User agrees to indemnify and hold harmless Palamu Express, its founders, editors, employees, and affiliates against: legal claims, damages, defamation disputes, copyright violations, or regulatory penalties arising from User-submitted content."
        ]
      },
      {
        title: "12. ACCOUNT TERMINATION",
        content: [
          "Palamu Express reserves the right to suspend or terminate access immediately if the User: violates these Terms, publishes fake or unlawful content, harms platform reputation, or engages in misconduct or abuse. Termination may occur without prior notice in serious cases."
        ]
      },
      {
        title: "13. AMENDMENTS",
        content: [
          "Palamu Express may revise these Terms & Conditions at any time. Updated terms become effective upon publication on the Platform or notification to Users. Continued use of the Platform constitutes acceptance of revised terms."
        ]
      },
      {
        title: "14. GOVERNING LAW & JURISDICTION",
        content: [
          "This Agreement shall be governed by the laws of India. Any disputes arising out of or relating to this Agreement shall fall under the exclusive jurisdiction of competent courts located in Garhwa."
        ]
      }
    ],
    acceptanceTitle: "Digital Acceptance",
    acceptanceText: "By registering, accessing, or using Palamu Express, the User confirms that they have read and understood this Agreement, all information provided is accurate, and they agree to comply with all platform policies, editorial standards, and legal obligations.",
    hyperLocalText: "Hyper Local Digital News Platform",
    authorizedBy: "Authorized By",
    acceptedBy: "Accepted By",
    dateText: "Date",
    dateVal: "21 May 2026",
    statusText: "Status",
    statusVal: "Digital Onboarding Verification Pending",
    dateOfAgreement: "Date of Agreement",
    userAcceptance: "USER ACCEPTANCE"
  },
  hi: {
    title: "पलामू एक्सप्रेस डिजिटल मीडिया",
    subtitle: "नियम और शर्तें समझौता",
    reporterAgreement: "रिपोर्टर, योगदानकर्ता और मुख्य संपादक समझौता",
    effectiveDate: "प्रभावी तिथि",
    jurisdiction: "अधिकार क्षेत्र",
    websites: "वेबसाइटें",
    sections: [
      {
        title: "1. प्रस्तावना",
        content: [
          "यह नियम और शर्तें समझौता (“समझौता”) पलामू एक्सप्रेस डिजिटल समाचार प्लेटफॉर्म (“प्लेटफॉर्म”) पर संवाददाताओं (रिपोटर्स), योगदानकर्ताओं, मुख्य संपादकों और संबद्ध मीडिया कर्मियों (“उपयोगकर्ता”) के ऑनबोर्डिंग, पहुंच और उपयोग को नियंत्रित करता है।",
          "पलामू एक्सप्रेस पर पंजीकरण करके, पहुंच प्राप्त करके या सामग्री प्रकाशित करके, उपयोगकर्ता इसमें उल्लिखित सभी शर्तों का पालन करने के लिए सहमत होता है।"
        ]
      },
      {
        title: "2. प्लेटफॉर्म के बारे में",
        content: [
          "पलामू एक्सप्रेस एक हाइपर-लोकल डिजिटल समाचार और मीडिया प्लेटफॉर्म है जो झारखंड और आसपास के क्षेत्रों से विश्वसनीय, सत्यापित और समुदाय-केंद्रित समाचार कवरेज देने पर केंद्रित है।",
          "प्लेटफॉर्म सक्षम बनाता है:"
        ],
        bullets: [
          "समाचार रिपोर्टिंग",
          "संपादकीय समीक्षा",
          "डिजिटल प्रकाशन",
          "सार्वजनिक सूचना प्रसार",
          "हाइपर-लोकल पत्रकारिता और मीडिया संचालन"
        ]
      },
      {
        title: "3. उपयोगकर्ता की पात्रता",
        content: [
          "प्लेटफॉर्म का उपयोग करने के लिए, उपयोगकर्ता को:"
        ],
        bullets: [
          "कम से कम 18 वर्ष का होना चाहिए",
          "समझौतों में प्रवेश करने की कानूनी क्षमता होनी चाहिए",
          "सटीक पंजीकरण विवरण प्रदान करना चाहिए",
          "भारतीय कानूनों और मीडिया नियमों का पालन करना चाहिए",
          "व्यावसायिकता और नैतिक आचरण बनाए रखना चाहिए"
        ],
        postContent: "पलामू एक्सप्रेस अनुमोदन से पहले पहचान और क्रेडेंशियल सत्यापित करने का अधिकार सुरक्षित रखता है।"
      },
      {
        title: "4. भूमिका और जिम्मेदारियां",
        subsections: [
          {
            title: "4.1 रिपोर्टिंग मानक",
            content: "उपयोगकर्ताओं को यह सुनिश्चित करना चाहिए कि सभी प्रस्तुत समाचार, लेख, चित्र, वीडियो और जानकारी: तथ्यात्मक रूप से सटीक, ठीक से सत्यापित, गलत सूचना से मुक्त और कानूनी साधनों के माध्यम से एकत्र की गई हो।"
          },
          {
            title: "4.2 संपादकीय नैतिकता",
            content: "उपयोगकर्ता करेंगे: नैतिक पत्रकारिता मानकों का पालन करेंगे, सनसनीखेज और नकली समाचारों से बचेंगे, जनता की संवेदनशीलता और गोपनीयता का सम्मान करेंगे, और जहां लागू हो रिपोर्टिंग में तटस्थता बनाए रखेंगे।"
          },
          {
            title: "4.3 प्रतिबंधित गतिविधियाँ",
            content: "उपयोगकर्ता निम्न नहीं करेंगे: झूठी, मानहानिकारक, घृणास्पद या भ्रामक सामग्री प्रकाशित करना; हिंसा, सांप्रदायिक घृणा या अवैध गतिविधियों को बढ़ावा देना; कॉपीराइट या बौद्धिक संपदा अधिकारों का उल्लंघन करना; अधिकारियों या सार्वजनिक प्राधिकरणों का रूप धारण करना; अश्लील या गैरकानूनी सामग्री अपलोड करना; या प्रकटीकरण के बिना राजनीतिक या व्यक्तिगत लाभ के लिए समाचारों में हेरफेर करना।"
          }
        ]
      },
      {
        title: "5. सामग्री स्वामित्व और लाइसेंस",
        content: [
          "उपयोगकर्ता अपनी मूल सामग्री का स्वामित्व बनाए रखते हैं।",
          "सामग्री जमा करके, उपयोगकर्ता पलामू एक्सप्रेस को एक गैर-विशिष्ट, रॉयल्टी-मुक्त, विश्वव्यापी लाइसेंस प्रदान करते हैं: डिजिटल और सामाजिक प्लेटफॉर्मों पर सामग्री को प्रकाशित करने, संपादित करने, अनुवाद करने, बढ़ावा देने, संग्रहीत करने और वितरित करने के लिए।",
          "पलामू एक्सप्रेस मूल अर्थ को बदले बिना संपादकीय उद्देश्यों के लिए स्वरूपण, सुर्खियों, व्याकरण या प्रस्तुति को संशोधित कर सकता है।"
        ]
      },
      {
        title: "6. तथ्य-जांच और मॉडरेशन",
        content: [
          "सभी प्रस्तुत सामग्री निम्नलिखित के अधीन है: संपादकीय समीक्षा, सत्यापन जाँच और मॉडरेशन अनुमोदन।",
          "पलामू एक्सप्रेस के पास अधिकार सुरक्षित है: किसी भी सबमिशन को अस्वीकार करना, प्रकाशित सामग्री को हटाना, प्रकाशन पहुंच को निलंबित करना, या सुधार या सहायक साक्ष्य का अनुरोध करना। प्लेटफॉर्म द्वारा लिए गए संपादकीय निर्णय अंतिम होंगे।"
        ]
      },
      {
        title: "7. कानूनी और नियामक अनुपालन",
        content: [
          "उपयोगकर्ता पालन करने के लिए सहमत हैं: भारत के कानून, सूचना प्रौद्योगिकी अधिनियम, 2000, भारतीय प्रेस परिषद के दिशानिर्देश, डिजिटल मीडिया और प्रसारण नियम, और लागू राज्य और जिला प्रशासनिक आदेश।",
          "किसी भी उल्लंघन के परिणामस्वरूप: खाता निलंबन, अधिकारियों को कानूनी रिपोर्टिंग, या प्लेटफॉर्म से स्थायी प्रतिबंध हो सकता है।"
        ]
      },
      {
        title: "8. गोपनीयता और गोपनीयता",
        content: [
          "पलामू एक्सप्रेस उपयोगकर्ता की जानकारी और अप्रकाशित संपादकीय सामग्री की सुरक्षा के लिए उचित कदम उठाएगा।",
          "उपयोगकर्ता को चाहिए: लॉगिन क्रेडेंशियल की गोपनीयता बनाए रखना, अप्रकाशित या संवेदनशील न्यूज़रूम जानकारी की रक्षा करना, और आंतरिक संचार के अनधिकृत साझाकरण से बचना। कानून या सरकारी अधिकारियों द्वारा आवश्यक होने पर प्लेटफॉर्म जानकारी का खुलासा कर सकता है।"
        ]
      },
      {
        title: "9. बौद्धिक संपदा",
        content: [
          "पलामू एक्सप्रेस से संबंधित सभी लोगो, ब्रांडिंग, सॉफ्टवेयर, लेआउट, डिजाइन और प्लेटफॉर्म संपत्ति संरक्षित बौद्धिक संपदा हैं।",
          "कोई भी उपयोगकर्ता: ब्रांडिंग की नकल नहीं कर सकता, डुप्लिकेट प्लेटफॉर्म नहीं बना सकता, या लिखित अनुमति के बिना कंपनी की पहचान का उपयोग नहीं कर सकता।"
        ]
      },
      {
        title: "10. भुगतान और मुआवजा (यदि लागू हो)",
        content: [
          "जहां मुआवजे की व्यवस्था मौजूद है: भुगतान अलग-अलग लिखित समझौतों द्वारा शासित होंगे; पलामू एक्सप्रेस नीति उल्लंघन, साहित्यिक चोरी या धोखाधड़ी की रिपोर्टिंग के लिए भुगतान रोक सकता है; और ऑनबोर्डिंग के माध्यम से ऑनबोर्डिंग के लिए कोई रोजगार संबंध स्वचालित रूप से नहीं बनता है जब तक कि विशेष रूप से कहा न गया हो।"
        ]
      },
      {
        title: "11. देयता अस्वीकरण",
        content: [
          "पलामू एक्सप्रेस एक प्रकाशन और मीडिया प्लेटफॉर्म के रूप में कार्य करता है और स्वतंत्र रूप से प्रस्तुत उपयोगकर्ता सामग्री के लिए पूरी तरह उत्तरदायी नहीं होगा।",
          "उपयोगकर्ता पलामू एक्सप्रेस, उसके संस्थापकों, संपादकों, कर्मचारियों और सहयोगियों को क्षतिपूर्ति देने और हानिरहित रखने के लिए सहमत है: उपयोगकर्ता द्वारा प्रस्तुत सामग्री से उत्पन्न होने वाले कानूनी दावों, क्षतियों, मानहानि विवादों, कॉपीराइट उल्लघनों, या नियामक दंडों के खिलाफ।"
        ]
      },
      {
        title: "12. खाता निलंबन/समाप्ति",
        content: [
          "पलामू एक्सप्रेस तत्काल पहुंच को निलंबित या समाप्त करने का अधिकार सुरक्षित रखता है यदि उपयोगकर्ता: इन शर्तों का उल्लंघन करता है, नकली या गैरकानूनी सामग्री प्रकाशित करता है, प्लेटफॉर्म की प्रतिष्ठा को नुकसान पहुंचाता है, या कदाचार या दुर्व्यवहार में शामिल होता है। गंभीर मामलों में बिना किसी पूर्व सूचना के समाप्ति हो सकती है।"
        ]
      },
      {
        title: "13. संशोधन",
        content: [
          "पलामू एक्सप्रेस किसी भी समय इन नियमों और शर्तों को संशोधित कर सकता है। अपडेट की गई शर्तें प्लेटफॉर्म पर प्रकाशन या उपयोगकर्ताओं को अधिसूचना पर प्रभावी हो जाती हैं। प्लेटफॉर्म का निरंतर उपयोग संशोधित शर्तों की स्वीकृति का गठन करता है।"
        ]
      },
      {
        title: "14. शासी कानून और अधिकार क्षेत्र",
        content: [
          "यह समझौता भारत के कानूनों द्वारा शासित होगा। इस समझौते से उत्पन्न या उससे संबंधित किसी भी विवाद का निपटारा गढ़वा में स्थित सक्षम न्यायालयों के अनन्य क्षेत्राधिकार के अंतर्गत होगा।"
        ]
      }
    ],
    acceptanceTitle: "डिजिटल स्वीकृति",
    acceptanceText: "पंजीकरण करके, पहुंच प्राप्त करके या पलामू एक्सप्रेस का उपयोग करके, उपयोगकर्ता पुष्टि करता है कि उसने इस समझौते को पढ़ और समझ लिया है, प्रदान की गई सभी जानकारी सटीक है, और वह सभी प्लेटफॉर्म नीतियों, संपादकीय मानकों और कानूनी दायित्वों का पालन करने के लिए सहमत है।",
    hyperLocalText: "हाइपर लोकल डिजिटल न्यूज प्लेटफॉर्म",
    authorizedBy: "अधिकृत",
    acceptedBy: "स्वीकृतकर्ता",
    dateText: "तिथि",
    dateVal: "21 मई 2026",
    statusText: "स्थिति",
    statusVal: "डिजिटल ऑनबोर्डिंग सत्यापन लंबित",
    dateOfAgreement: "समझौते की तिथि",
    userAcceptance: "उपयोगकर्ता स्वीकृति"
  }
};

export const TermsModal = ({ open, onClose, userName }) => {
  const [lang, setLang] = useState("en");

  if (!open) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print/save the Terms & Conditions.");
      return;
    }

    const cleanUserName = userName?.trim() || (lang === "en" ? "Enrolling User" : "उपयोगकर्ता");
    const data = termsData[lang];

    const sectionsHtml = data.sections.map(section => {
      let html = `<section><h3>${section.title}</h3>`;
      if (section.content) {
        section.content.forEach(p => {
          html += `<p>${p}</p>`;
        });
      }
      if (section.bullets) {
        html += `<ul>`;
        section.bullets.forEach(li => {
          html += `<li>${li}</li>`;
        });
        html += `</ul>`;
      }
      if (section.postContent) {
        html += `<p>${section.postContent}</p>`;
      }
      if (section.subsections) {
        section.subsections.forEach(sub => {
          html += `<div class="sub-section">
            <h4>${sub.title}</h4>
            <p>${sub.content}</p>
          </div>`;
        });
      }
      html += `</section>`;
      return html;
    }).join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.title} - ${data.subtitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              background-color: #fff;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header h2 {
              font-size: 16px;
              margin: 5px 0 0 0;
              color: #ea580c;
              font-weight: 600;
            }
            .meta {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #64748b;
              margin-top: 15px;
            }
            section {
              margin-bottom: 25px;
            }
            h3 {
              font-size: 14px;
              color: #0f172a;
              margin-bottom: 8px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 4px;
            }
            p {
              font-size: 13px;
              margin: 0 0 10px 0;
              text-align: justify;
            }
            ul {
              margin: 0 0 15px 0;
              padding-left: 20px;
              font-size: 13px;
            }
            li {
              margin-bottom: 5px;
            }
            .sub-section {
              padding-left: 15px;
              margin-bottom: 15px;
            }
            .sub-section h4 {
              font-size: 13px;
              color: #1e293b;
              margin: 0 0 5px 0;
            }
            .acceptance {
              margin-top: 40px;
              border: 1px solid #e2e8f0;
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .acceptance h4 {
              margin: 0 0 10px 0;
              font-size: 12px;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .acceptance p {
              font-size: 11px;
              color: #475569;
              line-height: 1.5;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 25px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 15px;
            }
            .signature-block h5 {
              margin: 0 0 4px 0;
              font-size: 12px;
              color: #0f172a;
            }
            .signature-block p {
              margin: 0;
              font-size: 11px;
              color: #64748b;
            }
            .highlight {
              color: #ea580c;
              font-weight: 600;
            }
            @media print {
              body {
                padding: 20px;
                color: #000;
              }
              .acceptance {
                background-color: #fff !important;
                border: 1px solid #000 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${lang === "en" ? "PALAMU EXPRESS DIGITAL MEDIA" : "पलामू एक्सप्रेस डिजिटल मीडिया"}</h1>
            <h2>${data.subtitle}</h2>
            <div class="meta">
              <span><strong>${data.effectiveDate}:</strong> 21 ${lang === "en" ? "May" : "मई"} 2026</span>
              <span><strong>${data.websites}:</strong> palamuexpress.com | palamuexpress.in | palamuexpress.live</span>
              <span><strong>${data.jurisdiction}:</strong> ${lang === "en" ? "Garhwa" : "गढ़वा"}</span>
            </div>
          </div>

          ${sectionsHtml}

          <div class="acceptance">
            <h4>${data.acceptanceTitle}</h4>
            <p>${data.acceptanceText}</p>
            <div class="signature-grid">
              <div class="signature-block">
                <h5>${lang === "en" ? "PALAMU EXPRESS DIGITAL MEDIA" : "पलामू एक्सप्रेस डिजिटल मीडिया"}</h5>
                <p>${data.hyperLocalText}</p>
                <p><strong>${data.authorizedBy}:</strong> ${lang === "en" ? "Pankaj Kumar Gupta" : "पंकज कुमार गुप्ता"}</p>
                <p><strong>${data.dateText}:</strong> 21 ${lang === "en" ? "May" : "मई"} 2026</p>
              </div>
              <div class="signature-block">
                <h5>${data.userAcceptance}</h5>
                <p><strong>${data.acceptedBy}:</strong> <span class="highlight">${cleanUserName}</span></p>
                <p><strong>${data.statusText}:</strong> ${data.statusVal}</p>
                <p><strong>${data.dateOfAgreement}:</strong> 21 ${lang === "en" ? "May" : "मई"} 2026</p>
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm">
      <div className="flex h-full max-h-[85vh] w-full max-w-2xl flex-col rounded-[28px] border border-white/10 bg-slate-950/95 shadow-[0_32px_80px_rgba(15,23,42,0.45)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Enrollment Portal</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Terms & Conditions</h2>
          </div>
          
          {/* Language Toggle */}
          <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 border border-white/10 mx-4">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "en" ? "bg-orange-500 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "hi" ? "bg-orange-500 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              हिंदी
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
            aria-label="Close terms popup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-7 text-slate-300">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              {lang === "en" ? "PALAMU EXPRESS – TERMS & CONDITIONS AGREEMENT" : "पलामू एक्सप्रेस – नियम और शर्तें समझौता"}
            </h3>
            <p className="text-sm font-semibold text-orange-300/80 mt-1">
              {termsData[lang].reporterAgreement}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
              <p><span className="font-semibold text-slate-300">{termsData[lang].effectiveDate}:</span> 21 {lang === "en" ? "May" : "मई"} 2026</p>
              <p><span className="font-semibold text-slate-300">{termsData[lang].websites}:</span> palamuexpress.com | palamuexpress.in | palamuexpress.live</p>
              <p><span className="font-semibold text-slate-300">{termsData[lang].jurisdiction}:</span> {lang === "en" ? "Garhwa" : "गढ़वा"}</p>
            </div>
          </div>

          {termsData[lang].sections.map((section, idx) => (
            <section key={idx} className="space-y-2">
              <h4 className="font-semibold text-white">{section.title}</h4>
              {section.content && section.content.map((p, pIdx) => (
                <p key={pIdx}>{p}</p>
              ))}
              {section.bullets && (
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  {section.bullets.map((bullet, bIdx) => (
                    <li key={bIdx}>{bullet}</li>
                  ))}
                </ul>
              )}
              {section.postContent && (
                <p>{section.postContent}</p>
              )}
              {section.subsections && (
                <div className="pl-4 space-y-3">
                  {section.subsections.map((sub, sIdx) => (
                    <div key={sIdx}>
                      <h5 className="font-medium text-white">{sub.title}</h5>
                      <p className="text-slate-400">{sub.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="font-semibold text-white uppercase tracking-wider text-xs">
              {termsData[lang].acceptanceTitle}
            </p>
            <p className="text-xs text-slate-400">
              {termsData[lang].acceptanceText}
            </p>
            <div className="border-t border-white/10 mt-3 pt-3 flex flex-wrap justify-between gap-4 text-xs">
              <div>
                <p className="font-semibold text-white">
                  {lang === "en" ? "PALAMU EXPRESS DIGITAL MEDIA" : "पलामू एक्सप्रेस डिजिटल मीडिया"}
                </p>
                <p className="text-slate-400">{termsData[lang].hyperLocalText}</p>
                <p className="text-slate-400 mt-1">
                  <span className="text-slate-300 font-semibold">{termsData[lang].authorizedBy}:</span>{" "}
                  {lang === "en" ? "Pankaj Kumar Gupta" : "पंकज कुमार गुप्ता"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">
                  <span className="text-slate-300 font-semibold">{termsData[lang].acceptedBy}:</span>{" "}
                  <span className="text-orange-300 font-semibold text-[13px]">
                    {userName?.trim() || (lang === "en" ? "Enrolling User" : "उपयोगकर्ता")}
                  </span>
                </p>
                <p className="text-slate-400 mt-1">
                  <span className="text-slate-300 font-semibold">{termsData[lang].dateText}:</span> 21 {lang === "en" ? "May" : "मई"} 2026
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 border-t border-white/10 p-6 bg-slate-950">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-full border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 transition px-5 py-2 text-sm font-semibold"
          >
            Save as PDF / Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-orange-500 hover:bg-orange-400 transition px-6 py-2 text-sm font-semibold text-white"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
