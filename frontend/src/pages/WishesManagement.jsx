const handleSend = async () => {
  if (selectedIds.length === 0) {
    toast.error('Please select at least one person');
    return;
  }

  const confirmMsg = `Send ${activeTab} wishes to ${selectedIds.length} selected ${selectedIds.length === 1 ? 'person' : 'people'}?`;
  if (!window.confirm(confirmMsg)) return;

  setSending(true);
  try {
    const endpoint = activeTab === 'birthday' ? 'birthdays' : 'anniversaries';
    const { data } = await api.post(`/wishes/${endpoint}/send`, {
      believerIds: selectedIds
    });
    
    // ✅ Updated message
    toast.success(
      `✅ Wishes are being sent! This may take a few minutes. Check Render logs to see progress.`,
      { duration: 6000 }
    );
    
    setSelectedIds([]);
    
    // ✅ Show info about background processing
    setTimeout(() => {
      toast('💡 Tip: Wishes are sent in the background. Check your email delivery after 2-3 minutes.', {
        duration: 5000,
        icon: 'ℹ️'
      });
    }, 1000);
    
  } catch (err) {
    toast.error(parseApiError(err));
  } finally {
    setSending(false);
  }
};
