// client/src/pages/InfoPage.jsx
// Renders the static content pages linked from the footer, in EN or AR.
import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks';
import { usePrefs } from '@/providers/PreferencesProvider';

const PAGES = {
  'help-center': {
    EN: {
      title: 'Help Center',
      subtitle: 'Answers to the most common questions about WareShare.',
      sections: [
        {
          heading: 'Booking storage',
          bullets: [
            'Search by city, zone, warehouse type, area, and price — then send a booking request with your dates.',
            'The host reviews your request and approves or declines it. You are only charged after approval.',
            'You can message the host before booking using the chat on any listing page.',
          ],
        },
        {
          heading: 'Payments',
          bullets: [
            'Prices are shown in JOD per day. The total includes any insurance, packing, or delivery add-ons you select.',
            'Payment is completed after the host approves your booking.',
          ],
        },
        {
          heading: 'Cancellations & changes',
          bullets: [
            'Need different dates? Message the host from your booking chat — most changes can be arranged directly.',
            'If a host cancels an approved booking, you are fully refunded.',
          ],
        },
        {
          heading: 'Still stuck?',
          body: ['Send us the details and a human will reply by email.'],
        },
      ],
      cta: { label: 'Report an issue', to: '/support/report?category=help&source=help-center' },
    },
    AR: {
      title: 'مركز المساعدة',
      subtitle: 'إجابات على أكثر الأسئلة شيوعًا حول وير شير.',
      sections: [
        {
          heading: 'حجز مساحة تخزين',
          bullets: [
            'ابحث حسب المدينة والمنطقة ونوع المستودع والمساحة والسعر — ثم أرسل طلب حجز بالتواريخ التي تناسبك.',
            'يراجع المضيف طلبك ويوافق عليه أو يرفضه، ولا يتم الدفع إلا بعد الموافقة.',
            'يمكنك مراسلة المضيف قبل الحجز عبر المحادثة الموجودة في صفحة أي مستودع.',
          ],
        },
        {
          heading: 'الدفع',
          bullets: [
            'الأسعار معروضة بالدينار الأردني لليوم الواحد، ويشمل الإجمالي أي إضافات تختارها من تأمين أو تغليف أو توصيل.',
            'يتم إتمام الدفع بعد موافقة المضيف على حجزك.',
          ],
        },
        {
          heading: 'الإلغاء والتعديل',
          bullets: [
            'تحتاج تواريخ مختلفة؟ راسل المضيف من محادثة الحجز — أغلب التعديلات تُرتَّب مباشرة.',
            'إذا ألغى المضيف حجزًا تمت الموافقة عليه، يُعاد لك المبلغ كاملًا.',
          ],
        },
        {
          heading: 'ما زلت بحاجة لمساعدة؟',
          body: ['أرسل لنا التفاصيل وسيرد عليك أحد فريقنا عبر البريد الإلكتروني.'],
        },
      ],
      cta: { label: 'الإبلاغ عن مشكلة', to: '/support/report?category=help&source=help-center' },
    },
  },

  'safety-security': {
    EN: {
      title: 'Safety & security guidelines',
      subtitle: 'How we keep goods, people, and facilities safe on WareShare.',
      sections: [
        {
          heading: 'Verified hosts',
          body: [
            'Every host must submit identity and company documents before their listings can go live. Look for the ✅ Verified host badge on profiles.',
          ],
        },
        {
          heading: 'Facility safety features',
          bullets: [
            'Listings display their safety equipment: CCTV, security guards, fire suppression systems, and certifications.',
            'Use the safety filters on the home page to only see warehouses with the features your goods require.',
            'Food-grade and hazmat certifications are shown on listings that have them — always confirm certificates for regulated goods.',
          ],
        },
        {
          heading: 'Your responsibilities',
          bullets: [
            'Declare your goods accurately when booking — especially hazardous, perishable, or high-value items.',
            'Follow the host’s facility rules for access hours, handling equipment, and prohibited items.',
            'Report any safety concern immediately through Report an issue.',
          ],
        },
      ],
      cta: { label: 'Report a safety concern', to: '/support/report?category=safety&source=safety-guidelines' },
    },
    AR: {
      title: 'إرشادات السلامة والأمان',
      subtitle: 'كيف نحافظ على سلامة البضائع والأشخاص والمنشآت على وير شير.',
      sections: [
        {
          heading: 'مضيفون موثّقون',
          body: [
            'يجب على كل مضيف تقديم وثائق الهوية والشركة قبل نشر إعلاناته. ابحث عن شارة ✅ مضيف موثّق في الملفات الشخصية.',
          ],
        },
        {
          heading: 'ميزات السلامة في المنشأة',
          bullets: [
            'تعرض الإعلانات تجهيزات السلامة: كاميرات المراقبة، حراس الأمن، أنظمة إطفاء الحريق، والشهادات.',
            'استخدم فلاتر السلامة في الصفحة الرئيسية لعرض المستودعات التي توفر المتطلبات التي تحتاجها بضائعك فقط.',
            'تظهر شهادات الجودة الغذائية والمواد الخطرة على الإعلانات الحاصلة عليها — تأكد دائمًا من الشهادات للبضائع الخاضعة للتنظيم.',
          ],
        },
        {
          heading: 'مسؤولياتك',
          bullets: [
            'صرّح عن بضائعك بدقة عند الحجز — خصوصًا المواد الخطرة أو القابلة للتلف أو عالية القيمة.',
            'التزم بقواعد المنشأة الخاصة بالمضيف من ساعات الدخول ومعدات المناولة والمواد الممنوعة.',
            'أبلغ فورًا عن أي مخاوف تتعلق بالسلامة عبر صفحة الإبلاغ عن مشكلة.',
          ],
        },
      ],
      cta: { label: 'الإبلاغ عن مشكلة سلامة', to: '/support/report?category=safety&source=safety-guidelines' },
    },
  },

  'warehouse-access': {
    EN: {
      title: 'Warehouse access & check-in',
      subtitle: 'What to expect when dropping off or picking up your goods.',
      sections: [
        {
          heading: 'Before you arrive',
          bullets: [
            'Coordinate your arrival window with the host in the booking chat.',
            'Check the listing for loading docks, ramps, and forklift availability so your transport matches the facility.',
            'Bring a copy of your booking confirmation and a valid ID.',
          ],
        },
        {
          heading: 'At check-in',
          bullets: [
            'The host or facility staff will verify your booking and record what is stored.',
            'Photograph your goods at drop-off — it protects both sides if a claim is ever needed.',
            'Agree with the host on how additional visits during the booking period work.',
          ],
        },
        {
          heading: 'Access during your booking',
          body: [
            'Access hours vary by facility and are listed on each warehouse page. Some facilities offer 24/7 access; others operate business hours only. Always arrange visits through the booking chat so there is a record.',
          ],
        },
      ],
    },
    AR: {
      title: 'الوصول للمستودع وتسجيل الدخول',
      subtitle: 'ما الذي تتوقعه عند تسليم بضائعك أو استلامها.',
      sections: [
        {
          heading: 'قبل الوصول',
          bullets: [
            'نسّق موعد وصولك مع المضيف عبر محادثة الحجز.',
            'تحقق من الإعلان بخصوص أرصفة التحميل والمنحدرات وتوفر الرافعة الشوكية حتى تتناسب وسيلة نقلك مع المنشأة.',
            'أحضر نسخة من تأكيد الحجز وهوية سارية المفعول.',
          ],
        },
        {
          heading: 'عند تسجيل الدخول',
          bullets: [
            'سيتحقق المضيف أو موظفو المنشأة من حجزك ويسجلون ما يتم تخزينه.',
            'صوّر بضائعك عند التسليم — فهذا يحمي الطرفين إذا احتجت لتقديم مطالبة لاحقًا.',
            'اتفق مع المضيف على آلية الزيارات الإضافية خلال فترة الحجز.',
          ],
        },
        {
          heading: 'الوصول خلال فترة الحجز',
          body: [
            'تختلف ساعات الوصول حسب المنشأة وهي معروضة في صفحة كل مستودع. بعض المنشآت توفر وصولًا على مدار الساعة، وأخرى خلال ساعات العمل فقط. رتّب الزيارات دائمًا عبر محادثة الحجز ليكون هناك سجل.',
          ],
        },
      ],
    },
  },

  'insurance-claims': {
    EN: {
      title: 'Insurance & claims',
      subtitle: 'Optional coverage for the goods you store through WareShare.',
      sections: [
        {
          heading: 'How coverage works',
          bullets: [
            'When booking, you can declare the value of your goods and add insurance for a small daily fee.',
            'Two tiers are available: Standard for general goods and High-value for electronics, pharma, and similar categories.',
            'The fee is calculated per day based on your declared value and shown before you confirm.',
          ],
        },
        {
          heading: 'Filing a claim',
          bullets: [
            'Report the issue within 48 hours of discovering damage or loss.',
            'Provide your booking reference, photos from check-in, and photos of the damage.',
            'Claims are reviewed within 5 business days and paid out to your registered account.',
          ],
        },
        {
          heading: 'What is not covered',
          bullets: [
            'Goods stored without insurance selected at booking time.',
            'Undeclared hazardous materials or goods prohibited by the facility.',
            'Normal wear from long-term storage of perishable goods stored outside their required conditions.',
          ],
        },
      ],
      cta: { label: 'Start a claim', to: '/support/report?category=claim&source=insurance-claims' },
    },
    AR: {
      title: 'التأمين والمطالبات',
      subtitle: 'تغطية اختيارية للبضائع التي تخزنها عبر وير شير.',
      sections: [
        {
          heading: 'كيف تعمل التغطية',
          bullets: [
            'عند الحجز يمكنك التصريح بقيمة بضائعك وإضافة تأمين مقابل رسم يومي بسيط.',
            'تتوفر فئتان: قياسية للبضائع العامة، وعالية القيمة للإلكترونيات والأدوية وما شابهها.',
            'يُحتسب الرسم يوميًا بناءً على القيمة المصرّح بها ويظهر لك قبل تأكيد الحجز.',
          ],
        },
        {
          heading: 'تقديم مطالبة',
          bullets: [
            'أبلغ عن المشكلة خلال 48 ساعة من اكتشاف الضرر أو الفقدان.',
            'قدّم رقم الحجز وصور البضائع عند التسليم وصور الضرر.',
            'تُراجع المطالبات خلال 5 أيام عمل ويُدفع التعويض إلى حسابك المسجل.',
          ],
        },
        {
          heading: 'ما لا تشمله التغطية',
          bullets: [
            'البضائع المخزنة دون اختيار تأمين وقت الحجز.',
            'المواد الخطرة غير المصرّح بها أو البضائع الممنوعة في المنشأة.',
            'التلف الطبيعي للبضائع القابلة للتلف المخزنة خارج ظروفها المطلوبة.',
          ],
        },
      ],
      cta: { label: 'ابدأ مطالبة', to: '/support/report?category=claim&source=insurance-claims' },
    },
  },

  'list-your-warehouse': {
    EN: {
      title: 'List your warehouse',
      subtitle: 'Turn empty space into revenue in four steps.',
      sections: [
        {
          heading: '1. Create your host profile',
          body: [
            'Enable hosting in your profile and submit your ID and company registration. Verification usually takes less than a day.',
          ],
        },
        {
          heading: '2. Build your listing',
          body: [
            'Add photos, area, ceiling height, dock and equipment details, safety features, and the goods you accept. Complete listings get significantly more bookings.',
          ],
        },
        {
          heading: '3. Set pricing & availability',
          body: [
            'Choose your price per day and block any dates your space is unavailable using the availability calendar.',
          ],
        },
        {
          heading: '4. Go live',
          body: [
            'Once verified, publish your listing. You approve every booking request, and renters can message you first with questions.',
          ],
        },
      ],
      cta: { label: 'Create your listing', to: '/account/places/new' },
    },
    AR: {
      title: 'اعرض مستودعك',
      subtitle: 'حوّل المساحة الفارغة إلى دخل في أربع خطوات.',
      sections: [
        {
          heading: '1. أنشئ ملف المضيف',
          body: [
            'فعّل خاصية الاستضافة في ملفك الشخصي وقدّم هويتك وسجل الشركة. عادةً ما يستغرق التوثيق أقل من يوم.',
          ],
        },
        {
          heading: '2. جهّز إعلانك',
          body: [
            'أضف الصور والمساحة وارتفاع السقف وتفاصيل الأرصفة والمعدات وميزات السلامة وأنواع البضائع المقبولة. الإعلانات المكتملة تحصل على حجوزات أكثر بكثير.',
          ],
        },
        {
          heading: '3. حدّد السعر والتوفر',
          body: [
            'اختر سعرك اليومي واحجب أي تواريخ تكون فيها مساحتك غير متاحة عبر تقويم التوفر.',
          ],
        },
        {
          heading: '4. انشر إعلانك',
          body: [
            'بعد التوثيق انشر إعلانك. أنت من يوافق على كل طلب حجز، ويمكن للمستأجرين مراسلتك أولًا للاستفسار.',
          ],
        },
      ],
      cta: { label: 'أنشئ إعلانك', to: '/account/places/new' },
    },
  },

  'pricing-tips': {
    EN: {
      title: 'Pricing & utilization tips',
      subtitle: 'Get the most out of your warehouse space.',
      sections: [
        {
          heading: 'Price to your market',
          bullets: [
            'Check what similar warehouses in your city and zone charge per day — renters compare.',
            'Cold, frozen, and certified (food-grade / hazmat) space commands premium rates.',
            'Consider a lower rate for your first bookings to build reviews, then adjust upward.',
          ],
        },
        {
          heading: 'Increase utilization',
          bullets: [
            'Keep your availability calendar current — stale calendars cause declined requests, which hurt your visibility.',
            'Respond to inquiries quickly. Fast responders win the majority of bookings.',
            'Offer add-on services (packing, forklift, transportation) — they raise revenue per booking.',
          ],
        },
        {
          heading: 'Present it well',
          bullets: [
            'Photos of clean, well-lit, organized space outperform everything else.',
            'List exact ceiling heights, dock counts, and pallet capacity — logistics teams filter on these numbers.',
          ],
        },
      ],
      cta: { label: 'List your warehouse', to: '/account/places/new' },
    },
    AR: {
      title: 'نصائح التسعير والاستغلال',
      subtitle: 'حقق أقصى استفادة من مساحة مستودعك.',
      sections: [
        {
          heading: 'سعّر حسب سوقك',
          bullets: [
            'اطّلع على أسعار المستودعات المشابهة في مدينتك ومنطقتك لليوم الواحد — فالمستأجرون يقارنون.',
            'المساحات المبردة والمجمدة والمعتمدة (غذائية / مواد خطرة) تحقق أسعارًا أعلى.',
            'فكّر في سعر أقل لحجوزاتك الأولى لبناء التقييمات، ثم ارفعه تدريجيًا.',
          ],
        },
        {
          heading: 'ارفع نسبة الإشغال',
          bullets: [
            'حافظ على تحديث تقويم التوفر — التقويمات القديمة تؤدي إلى رفض الطلبات مما يضر بظهورك.',
            'رد على الاستفسارات بسرعة، فالمضيفون السريعون يفوزون بأغلب الحجوزات.',
            'قدّم خدمات إضافية (تغليف، رافعة شوكية، نقل) — فهي ترفع إيراد كل حجز.',
          ],
        },
        {
          heading: 'اعرض مساحتك بشكل جيد',
          bullets: [
            'صور المساحات النظيفة والمضاءة والمنظمة تتفوق على كل شيء آخر.',
            'اذكر ارتفاعات الأسقف وعدد الأرصفة وسعة المنصات بدقة — ففرق اللوجستيات تبحث بهذه الأرقام.',
          ],
        },
      ],
      cta: { label: 'اعرض مستودعك', to: '/account/places/new' },
    },
  },

  'best-practices': {
    EN: {
      title: 'Operational best practices',
      subtitle: 'Run a smooth operation that earns 5-star reviews.',
      sections: [
        {
          heading: 'Onboarding renters',
          bullets: [
            'Agree access hours and contact points in the booking chat before check-in day.',
            'Walk renters through fire exits, equipment rules, and any restricted zones on first arrival.',
            'Record the condition and quantity of stored goods together at drop-off.',
          ],
        },
        {
          heading: 'During the booking',
          bullets: [
            'Keep stored goods for different renters clearly separated and labeled.',
            'Maintain your safety equipment — CCTV coverage and fire systems are why renters chose you.',
            'Communicate early if anything affects access (maintenance, holidays, power work).',
          ],
        },
        {
          heading: 'Check-out',
          bullets: [
            'Verify goods against the check-in record before release.',
            'Leave a renter review — it builds trust for the whole marketplace.',
          ],
        },
      ],
    },
    AR: {
      title: 'أفضل الممارسات التشغيلية',
      subtitle: 'أدر عملياتك بسلاسة واحصل على تقييمات خمس نجوم.',
      sections: [
        {
          heading: 'استقبال المستأجرين',
          bullets: [
            'اتفق على ساعات الدخول وجهات التواصل عبر محادثة الحجز قبل يوم الاستلام.',
            'عرّف المستأجرين عند أول وصول على مخارج الحريق وقواعد المعدات والمناطق المحظورة.',
            'سجّلا معًا حالة البضائع وكميتها عند التسليم.',
          ],
        },
        {
          heading: 'أثناء الحجز',
          bullets: [
            'احرص على فصل بضائع المستأجرين المختلفين ووسمها بوضوح.',
            'حافظ على تجهيزات السلامة — كاميرات المراقبة وأنظمة الحريق هي سبب اختيار المستأجرين لك.',
            'أبلغ مبكرًا عن أي شيء يؤثر على الوصول (صيانة، عطل، انقطاع كهرباء).',
          ],
        },
        {
          heading: 'التسليم النهائي',
          bullets: [
            'تحقق من البضائع مقابل سجل الاستلام قبل تسليمها.',
            'اترك تقييمًا للمستأجر — فهذا يبني الثقة في السوق بأكمله.',
          ],
        },
      ],
    },
  },

  partners: {
    EN: {
      title: 'Partner & enterprise solutions',
      subtitle: 'For 3PLs, logistics operators, and businesses with recurring storage needs.',
      sections: [
        {
          heading: 'Enterprise storage',
          body: [
            'Need distributed storage across multiple cities, dedicated capacity, or long-term contracts? We match enterprises with verified host networks and negotiated rates.',
          ],
        },
        {
          heading: 'Fleet & 3PL partners',
          body: [
            'Transportation and fulfillment providers can integrate with WareShare bookings to offer renters pickup, delivery, and packing services.',
          ],
        },
        {
          heading: 'Get in touch',
          body: [
            'Tell us about your volumes and locations through the contact form and our partnerships team will reach out.',
          ],
        },
      ],
      cta: { label: 'Contact partnerships', to: '/support/report?category=partnership&source=partners' },
    },
    AR: {
      title: 'حلول الشركاء والمؤسسات',
      subtitle: 'لشركات اللوجستيات ومقدمي الخدمات والشركات ذات احتياجات التخزين المتكررة.',
      sections: [
        {
          heading: 'تخزين للمؤسسات',
          body: [
            'تحتاج تخزينًا موزعًا على عدة مدن أو سعة مخصصة أو عقودًا طويلة الأجل؟ نوفّق المؤسسات مع شبكات مضيفين موثّقين وبأسعار تفاوضية.',
          ],
        },
        {
          heading: 'شركاء النقل واللوجستيات',
          body: [
            'يمكن لمزودي النقل والتجهيز التكامل مع حجوزات وير شير لتقديم خدمات الاستلام والتوصيل والتغليف للمستأجرين.',
          ],
        },
        {
          heading: 'تواصل معنا',
          body: [
            'أخبرنا عن أحجامك ومواقعك عبر نموذج التواصل وسيتواصل معك فريق الشراكات.',
          ],
        },
      ],
      cta: { label: 'تواصل مع فريق الشراكات', to: '/support/report?category=partnership&source=partners' },
    },
  },

  mission: {
    EN: {
      title: 'Our mission',
      subtitle: 'Unlock the region’s idle warehouse capacity.',
      sections: [
        {
          heading: 'Why WareShare exists',
          body: [
            'Across the region, thousands of square meters of warehouse space sit empty while growing businesses struggle to find flexible, affordable storage. Traditional leases demand year-long commitments that small traders, e-commerce sellers, and seasonal businesses cannot make.',
            'WareShare connects the two sides: hosts monetize spare capacity by the day, and renters get exactly the space they need, for exactly as long as they need it — with verification, insurance, and secure payments built in.',
          ],
        },
        {
          heading: 'What we believe',
          bullets: [
            'Storage should be as easy to book as a hotel room.',
            'Trust is built with verification, transparency, and reviews — not paperwork.',
            'Flexible logistics infrastructure helps small businesses compete with big ones.',
          ],
        },
      ],
    },
    AR: {
      title: 'رسالتنا',
      subtitle: 'إطلاق طاقات المستودعات غير المستغلة في المنطقة.',
      sections: [
        {
          heading: 'لماذا وُجدت وير شير',
          body: [
            'في مختلف أنحاء المنطقة، تقف آلاف الأمتار المربعة من المستودعات فارغة بينما تكافح الشركات النامية للعثور على تخزين مرن وبأسعار معقولة. عقود الإيجار التقليدية تتطلب التزامات سنوية لا يستطيع صغار التجار وبائعو التجارة الإلكترونية والأعمال الموسمية تحمّلها.',
            'وير شير تربط الطرفين: المضيفون يحققون دخلًا من مساحاتهم الفائضة باليوم، والمستأجرون يحصلون على المساحة التي يحتاجونها بالضبط وللمدة التي يحتاجونها — مع توثيق وتأمين ومدفوعات آمنة.',
          ],
        },
        {
          heading: 'ما نؤمن به',
          bullets: [
            'يجب أن يكون حجز التخزين بسهولة حجز غرفة فندق.',
            'الثقة تُبنى بالتوثيق والشفافية والتقييمات — لا بالأوراق.',
            'البنية اللوجستية المرنة تساعد الشركات الصغيرة على منافسة الكبيرة.',
          ],
        },
      ],
    },
  },

  'how-it-works': {
    EN: {
      title: 'How the marketplace works',
      subtitle: 'From search to check-out, in plain words.',
      sections: [
        {
          heading: 'For renters',
          bullets: [
            '1. Search — filter by location, type, area, price, safety features, and equipment.',
            '2. Inquire — chat with the host directly from the listing page.',
            '3. Book — send a request with your dates; add insurance, packing, or delivery if needed.',
            '4. Store — after host approval and payment, drop off your goods at check-in.',
            '5. Review — rate the warehouse and host when your booking completes.',
          ],
        },
        {
          heading: 'For hosts',
          bullets: [
            '1. Verify — submit your documents once and get the verified badge.',
            '2. List — publish your space with photos, specs, and daily pricing.',
            '3. Approve — accept the booking requests that fit your capacity.',
            '4. Earn — get paid for every day booked, plus optional add-on services.',
          ],
        },
      ],
    },
    AR: {
      title: 'كيف يعمل السوق',
      subtitle: 'من البحث إلى التسليم، بكلمات بسيطة.',
      sections: [
        {
          heading: 'للمستأجرين',
          bullets: [
            '1. ابحث — صفِّ النتائج حسب الموقع والنوع والمساحة والسعر وميزات السلامة والمعدات.',
            '2. استفسر — تحدث مع المضيف مباشرة من صفحة الإعلان.',
            '3. احجز — أرسل طلبًا بتواريخك؛ وأضف تأمينًا أو تغليفًا أو توصيلًا إذا احتجت.',
            '4. خزّن — بعد موافقة المضيف والدفع، سلّم بضائعك عند تسجيل الدخول.',
            '5. قيّم — قيّم المستودع والمضيف عند اكتمال حجزك.',
          ],
        },
        {
          heading: 'للمضيفين',
          bullets: [
            '1. وثّق — قدّم وثائقك مرة واحدة واحصل على شارة التوثيق.',
            '2. اعرض — انشر مساحتك بالصور والمواصفات والسعر اليومي.',
            '3. وافق — اقبل طلبات الحجز التي تناسب سعتك.',
            '4. اربح — احصل على أرباحك عن كل يوم محجوز، إضافة إلى الخدمات الاختيارية.',
          ],
        },
      ],
    },
  },

  careers: {
    EN: {
      title: 'Careers',
      subtitle: 'Help build the storage marketplace for the region.',
      sections: [
        {
          heading: 'Working at WareShare',
          body: [
            'We are a small team working on a real logistics problem with plenty of hard, interesting work: marketplace dynamics, trust and verification, payments, and on-the-ground operations.',
          ],
        },
        {
          heading: 'Open roles',
          body: [
            'We are not actively hiring right now, but we always want to hear from exceptional people in engineering, operations, and partnerships. Introduce yourself through the contact form and tell us what you would build.',
          ],
        },
      ],
      cta: { label: 'Introduce yourself', to: '/support/report?category=careers&source=careers' },
    },
    AR: {
      title: 'الوظائف',
      subtitle: 'ساعدنا في بناء سوق التخزين في المنطقة.',
      sections: [
        {
          heading: 'العمل في وير شير',
          body: [
            'نحن فريق صغير يعمل على مشكلة لوجستية حقيقية مليئة بالتحديات الشيقة: ديناميكيات السوق، الثقة والتوثيق، المدفوعات، والعمليات الميدانية.',
          ],
        },
        {
          heading: 'الوظائف المتاحة',
          body: [
            'لا نوظف حاليًا بشكل نشط، لكننا نرحب دائمًا بالمتميزين في الهندسة والعمليات والشراكات. عرّف بنفسك عبر نموذج التواصل وأخبرنا بما يمكنك بناؤه.',
          ],
        },
      ],
      cta: { label: 'عرّف بنفسك', to: '/support/report?category=careers&source=careers' },
    },
  },

  press: {
    EN: {
      title: 'Press & media',
      subtitle: 'Resources for journalists and creators.',
      sections: [
        {
          heading: 'About WareShare',
          body: [
            'WareShare is a marketplace for on-demand warehouse and storage space. Businesses rent verified storage by the day — from dry and cold storage to bonded and fulfillment facilities — while warehouse owners monetize idle capacity.',
          ],
        },
        {
          heading: 'Media inquiries',
          body: [
            'For interviews, statistics, or brand assets, contact us through the form below and mention "press" in your message.',
          ],
        },
      ],
      cta: { label: 'Contact us', to: '/support/report?category=press&source=press' },
    },
    AR: {
      title: 'الصحافة والإعلام',
      subtitle: 'موارد للصحفيين وصنّاع المحتوى.',
      sections: [
        {
          heading: 'عن وير شير',
          body: [
            'وير شير سوق لمساحات المستودعات والتخزين عند الطلب. تستأجر الشركات تخزينًا موثّقًا باليوم — من التخزين الجاف والمبرد إلى المستودعات الجمركية ومراكز التجهيز — بينما يحقق أصحاب المستودعات دخلًا من سعاتهم غير المستغلة.',
          ],
        },
        {
          heading: 'استفسارات إعلامية',
          body: [
            'للمقابلات أو الإحصاءات أو ملفات العلامة التجارية، تواصل معنا عبر النموذج واذكر كلمة "صحافة" في رسالتك.',
          ],
        },
      ],
      cta: { label: 'تواصل معنا', to: '/support/report?category=press&source=press' },
    },
  },

  esg: {
    EN: {
      title: 'ESG & sustainability',
      subtitle: 'Sharing existing space is inherently sustainable.',
      sections: [
        {
          heading: 'Environmental',
          bullets: [
            'Every shared warehouse means one fewer new building. Utilizing idle capacity reduces the concrete, steel, and land demanded by new construction.',
            'Matching renters to nearby storage cuts transport distances and emissions.',
          ],
        },
        {
          heading: 'Social',
          bullets: [
            'Flexible storage lowers the barrier for small traders and startups to grow.',
            'Hosts — often family businesses — earn new income from assets they already own.',
          ],
        },
        {
          heading: 'Governance',
          bullets: [
            'Host verification, transparent reviews, and secure payments protect everyone on the platform.',
            'We publish clear policies for safety, insurance, and prohibited goods.',
          ],
        },
      ],
    },
    AR: {
      title: 'الاستدامة والحوكمة',
      subtitle: 'مشاركة المساحات القائمة استدامة بطبيعتها.',
      sections: [
        {
          heading: 'البيئة',
          bullets: [
            'كل مستودع مُشارك يعني مبنى جديدًا أقل. استغلال السعات الفائضة يقلل ما يتطلبه البناء الجديد من إسمنت وحديد وأراضٍ.',
            'مطابقة المستأجرين مع تخزين قريب تقلل مسافات النقل والانبعاثات.',
          ],
        },
        {
          heading: 'المجتمع',
          bullets: [
            'التخزين المرن يخفض حاجز النمو أمام صغار التجار والشركات الناشئة.',
            'المضيفون — وغالبًا شركات عائلية — يحققون دخلًا جديدًا من أصول يملكونها أصلًا.',
          ],
        },
        {
          heading: 'الحوكمة',
          bullets: [
            'توثيق المضيفين والتقييمات الشفافة والمدفوعات الآمنة تحمي الجميع على المنصة.',
            'ننشر سياسات واضحة للسلامة والتأمين والبضائع الممنوعة.',
          ],
        },
      ],
    },
  },

  privacy: {
    EN: {
      title: 'Privacy policy',
      subtitle: 'What we collect and how we use it.',
      sections: [
        {
          heading: 'What we collect',
          bullets: [
            'Account data: name, email, and optional phone number.',
            'Host verification documents, used only for verification.',
            'Booking, listing, and message data needed to run the marketplace.',
          ],
        },
        {
          heading: 'How we use it',
          bullets: [
            'To operate bookings, payments, chat, and notifications.',
            'To verify hosts and keep the marketplace safe.',
            'We never sell your personal data to third parties.',
          ],
        },
        {
          heading: 'Your choices',
          bullets: [
            'You can update your profile data at any time from your account.',
            'To request account deletion or a copy of your data, contact us via Report an issue.',
          ],
        },
      ],
    },
    AR: {
      title: 'سياسة الخصوصية',
      subtitle: 'ما الذي نجمعه وكيف نستخدمه.',
      sections: [
        {
          heading: 'ما نجمعه',
          bullets: [
            'بيانات الحساب: الاسم والبريد الإلكتروني ورقم الهاتف اختياريًا.',
            'وثائق توثيق المضيف، وتُستخدم للتوثيق فقط.',
            'بيانات الحجوزات والإعلانات والرسائل اللازمة لتشغيل السوق.',
          ],
        },
        {
          heading: 'كيف نستخدمها',
          bullets: [
            'لتشغيل الحجوزات والمدفوعات والمحادثات والإشعارات.',
            'لتوثيق المضيفين والحفاظ على أمان السوق.',
            'لا نبيع بياناتك الشخصية لأي طرف ثالث أبدًا.',
          ],
        },
        {
          heading: 'خياراتك',
          bullets: [
            'يمكنك تحديث بيانات ملفك الشخصي في أي وقت من حسابك.',
            'لطلب حذف حسابك أو نسخة من بياناتك، تواصل معنا عبر صفحة الإبلاغ عن مشكلة.',
          ],
        },
      ],
    },
  },

  'company-details': {
    EN: {
      title: 'Company details',
      subtitle: 'Who is behind WareShare.',
      sections: [
        {
          heading: 'The company',
          body: [
            'WareShare is an early-stage technology company building the on-demand warehouse storage marketplace, headquartered in Amman, Jordan.',
          ],
        },
        {
          heading: 'What we operate',
          bullets: [
            'The WareShare web platform connecting storage renters with verified warehouse hosts.',
            'Host verification, booking, secure messaging, and payment coordination services.',
          ],
        },
        {
          heading: 'Contact',
          body: [
            'For legal, partnership, or company inquiries, reach us through the contact form and we will route your message to the right person.',
          ],
        },
      ],
      cta: { label: 'Contact us', to: '/support/report?category=other&source=company-details' },
    },
    AR: {
      title: 'بيانات الشركة',
      subtitle: 'من يقف خلف وير شير.',
      sections: [
        {
          heading: 'الشركة',
          body: [
            'وير شير شركة تقنية ناشئة تبني سوق تخزين المستودعات عند الطلب، ومقرها عمّان، الأردن.',
          ],
        },
        {
          heading: 'ما نشغّله',
          bullets: [
            'منصة وير شير الإلكترونية التي تربط مستأجري التخزين بمضيفي المستودعات الموثّقين.',
            'خدمات توثيق المضيفين والحجز والمراسلة الآمنة وتنسيق المدفوعات.',
          ],
        },
        {
          heading: 'التواصل',
          body: [
            'للاستفسارات القانونية أو الشراكات أو استفسارات الشركة، تواصل معنا عبر النموذج وسنوجه رسالتك للشخص المناسب.',
          ],
        },
      ],
      cta: { label: 'تواصل معنا', to: '/support/report?category=other&source=company-details' },
    },
  },

  terms: {
    EN: {
      title: 'Terms of service',
      subtitle: 'The rules of using WareShare.',
      sections: [
        {
          heading: 'The marketplace',
          body: [
            'WareShare provides the platform connecting renters and hosts. The storage agreement for each booking is between the renter and the host. Hosts are responsible for the accuracy of their listings; renters are responsible for accurately declaring stored goods.',
          ],
        },
        {
          heading: 'Bookings & payments',
          bullets: [
            'A booking is confirmed when the host approves it and payment is completed.',
            'Insurance, packing, and delivery add-ons are optional and priced at booking time.',
          ],
        },
        {
          heading: 'Prohibited use',
          bullets: [
            'Storing illegal goods, undeclared hazardous materials, or perishables in unsuitable facilities.',
            'Circumventing the platform to avoid fees after connecting through WareShare.',
            'Misrepresenting identity, certifications, or facility features.',
          ],
        },
      ],
    },
    AR: {
      title: 'شروط الخدمة',
      subtitle: 'قواعد استخدام وير شير.',
      sections: [
        {
          heading: 'السوق',
          body: [
            'توفر وير شير المنصة التي تربط المستأجرين بالمضيفين. اتفاقية التخزين لكل حجز تكون بين المستأجر والمضيف. المضيفون مسؤولون عن دقة إعلاناتهم، والمستأجرون مسؤولون عن التصريح الدقيق بالبضائع المخزنة.',
          ],
        },
        {
          heading: 'الحجوزات والمدفوعات',
          bullets: [
            'يُعتمد الحجز عند موافقة المضيف عليه وإتمام الدفع.',
            'إضافات التأمين والتغليف والتوصيل اختيارية وتُسعّر وقت الحجز.',
          ],
        },
        {
          heading: 'الاستخدام الممنوع',
          bullets: [
            'تخزين بضائع غير قانونية أو مواد خطرة غير مصرّح بها أو مواد قابلة للتلف في منشآت غير مناسبة.',
            'الالتفاف على المنصة لتجنب الرسوم بعد التواصل عبر وير شير.',
            'انتحال الهوية أو تزوير الشهادات أو ميزات المنشأة.',
          ],
        },
      ],
    },
  },
};

const InfoPage = () => {
  const { slug } = useParams();
  const { lang } = usePrefs();

  const pageGroup = PAGES[slug];
  const page = pageGroup ? pageGroup[lang] || pageGroup.EN : null;

  usePageTitle(page?.title || 'WareShare');

  if (!page) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mt-24 px-4 pb-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-gray-900">{page.title}</h1>
        {page.subtitle && (
          <p className="mt-2 text-gray-600">{page.subtitle}</p>
        )}

        <div className="mt-8 space-y-8">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                {s.heading}
              </h2>
              {s.body &&
                s.body.map((p, i) => (
                  <p key={i} className="mb-2 text-sm leading-6 text-gray-700">
                    {p}
                  </p>
                ))}
              {s.bullets && (
                <ul className="list-disc space-y-1 ps-5 text-sm leading-6 text-gray-700">
                  {s.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {page.cta && (
          <div className="mt-10">
            <Link
              to={page.cta.to}
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {page.cta.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoPage;
