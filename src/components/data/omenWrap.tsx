'use client'
import styles from '@/app/styles/dashboard.module.css' 

export default function OmenWrap({ children }: { children: React.ReactNode }) {

  return (
    <>
 
      <div className={styles.pageContainer}>
        <div className={styles.leftPageHeader}>
          <h1 className={styles.bigHeader}>
            OMENLAND  
            <span className={styles.redText}>DATA</span> 
          </h1>
        </div>

        {/* THE RESPONSIVE GRID LAYOUT CONTAINER */}
        <div className={styles.dashboardGrid}>
          {/* Main children components injected here from your sub-pages */}
          {children}
        </div>
      </div>
    </>
  )
}