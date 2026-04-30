import { useEffect } from 'react';

const useDocumentMetadata = ({ title, description }) => {
  useEffect(() => {
    const previousTitle = document.title;
    const existingMeta = document.querySelector('meta[name="description"]');
    const previousDescription = existingMeta?.getAttribute('content') || '';

    document.title = title;

    if (existingMeta) {
      existingMeta.setAttribute('content', description);

      return () => {
        document.title = previousTitle;
        existingMeta.setAttribute('content', previousDescription);
      };
    }

    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = description;
    document.head.appendChild(meta);

    return () => {
      document.title = previousTitle;

      if (document.head.contains(meta)) {
        document.head.removeChild(meta);
      }
    };
  }, [description, title]);
};

export default useDocumentMetadata;
