const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = require('./db');

// ✅ LOGIN
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });

    if (results.length > 0) {
      res.status(200).json({ message: 'Connexion réussie', user: results[0] });
    } else {
      res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
  });
});

// ✅ DASHBOARD STATSSS
app.get('/dashboard/stats', (req, res) => {
  const stats = {};

  const totalRoomsQuery = 'SELECT COUNT(*) AS total FROM chambre';
  db.query(totalRoomsQuery, (err, totalResult) => {
    if (err) return res.status(500).json({ error: 'Erreur total rooms' });

    stats.totalRooms = totalResult[0].total;

    const availableQuery = 'SELECT COUNT(*) AS available FROM chambre WHERE statut = "disponible"';
    db.query(availableQuery, (err, availableResult) => {
      if (err) return res.status(500).json({ error: 'Erreur available rooms' });

      stats.availableRooms = availableResult[0].available;
      stats.occupiedRooms = stats.totalRooms - stats.availableRooms;

      res.status(200).json(stats);
    });
  });
});
 
app.get('/dashboard/bookings', (req, res) => {
    const query = `
      SELECT 
        f.num_reservation,
        f.date,
        f.statut,
        CONCAT(c.nom, ' ', c.prenom) AS nomClient,
        c.num_ch  -- Récupération directe depuis la table Client
      FROM Facture f
      JOIN Client c ON f.id_C = c.id_C
      WHERE c.num_ch IS NOT NULL  -- S'assurer qu'on a bien un numéro de chambre
      ORDER BY f.date DESC
      LIMIT 5;
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des réservations:', err);
        return res.status(500).json({ message: 'Erreur chargement des réservations depuis Facture' });
      }
      
      console.log('Réservations récupérées:', results);
      res.status(200).json(results);
    });
  });
  
  // ✅ PLANNING DE NETTOYAGE (depuis la table Nettoyer)
  app.get('/dashboard/cleaning', (req, res) => {
    const query = `
      SELECT n.id_Ch, n.id_cleaner, n.date_heure, n.statut
      FROM Nettoyer n
      WHERE DATE(n.date_heure) = CURDATE()
      ORDER BY n.date_heure ASC
      LIMIT 5;
    `;
  
    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur chargement planning nettoyage' });
  
      res.status(200).json(results);
    });
  });
  

// ✅ CHAMBRES
app.get('/rooms', (req, res) => {
  const query = 'SELECT * FROM chambre ORDER BY num_ch ASC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur SQL /rooms :', err);
      return res.status(500).json({ message: 'Erreur chargement chambres' });
    }

    res.status(200).json(results);
  });
});
app.post('/rooms', (req, res) => {
    const { type, prix, caracteristiques, statut } = req.body;
  
    console.log('Reçu du frontend:', req.body); // 👈 ajoute ça
  
    if (!type || !prix || !caracteristiques || !statut) {
      return res.status(400).json({ error: 'Champs manquants.' });
    }
  
    const sql = 'INSERT INTO chambre (type, prix, caracteristiques, statut) VALUES (?, ?, ?, ?)';
    db.query(sql, [type, prix, caracteristiques, statut], (err, result) => {
      if (err) {
        console.error('Erreur MySQL:', err);
        return res.status(500).json({ error: 'Erreur base de données.' });
      }
  
      res.status(201).json({ message: 'Chambre ajoutée avec succès' });
    });
  });


  app.put('/rooms/:num_ch', (req, res) => {
    const { num_ch } = req.params;
    const { type, prix, caracteristiques, statut } = req.body;
  
    const sql = `
      UPDATE chambre
      SET type = ?, prix = ?, caracteristiques = ?, statut = ?
      WHERE num_ch = ?
    `;
  
    db.query(sql, [type, prix, caracteristiques, statut, num_ch], (err, result) => {
      if (err) {
        console.error('Erreur modification chambre :', err);
        return res.status(500).json({ error: 'Erreur modification chambre' });
      }
  
      res.json({ message: 'Chambre mise à jour avec succès' });
    });
  });
  
  
  
// ✅ UTILISATEURS
app.get('/users', (req, res) => {
    const query = 'SELECT * FROM users';
    db.query(query, (err, results) => {
      if (err) {
        console.error('Erreur récupération utilisateurs:', err);
        return res.status(500).json({ message: 'Erreur récupération utilisateurs', error: err });
      }
  
      res.status(200).json(results);
    });
  });
  
  app.post('/users', (req, res) => {
    const { nom, prenom, adresse, email, password, contact } = req.body;
  
    if (!nom || !prenom || !adresse || !email || !password || !contact) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
  
    const query = `
      INSERT INTO users (nom, prenom, adresse, email, password, contact)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
  
    db.query(query, [nom, prenom, adresse, email, password, contact], (err, results) => {
      if (err) {
        console.error('Erreur ajout utilisateur:', err);
        return res.status(500).json({ message: 'Erreur ajout utilisateur', error: err });
      }
  
      res.status(201).json({ message: 'Utilisateur ajouté avec succès', data: results });
    });
  });
  
  app.put('/users/:id_U', (req, res) => {
    const { id_U } = req.params;
    const { nom, prenom, adresse, email, password, contact } = req.body;
  
    if (!nom || !prenom || !adresse || !email || !password || !contact) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
  
    const query = `
      UPDATE users SET nom = ?, prenom = ?, adresse = ?, email = ?, password = ?, contact = ?
      WHERE id_U = ?
    `;
  
    db.query(query, [nom, prenom, adresse, email, password, contact, id_U], (err, results) => {
      if (err) {
        console.error('Erreur mise à jour utilisateur:', err);
        return res.status(500).json({ message: 'Erreur mise à jour utilisateur', error: err });
      }
  
      res.status(200).json({ message: 'Utilisateur mis à jour avec succès', data: results });
    });
  });
  
  app.delete('/users/:id_U', (req, res) => {
    const { id_U } = req.params;
  
    const query = 'DELETE FROM users WHERE id_U = ?';
  
    db.query(query, [id_U], (err, results) => {
      if (err) {
        console.error('Erreur suppression utilisateur:', err);
        return res.status(500).json({ message: 'Erreur suppression utilisateur', error: err });
      }
  
      res.status(200).json({ message: 'Utilisateur supprimé avec succès', data: results });
    });
  });
 // ✅ CLIENTS

// Récupérer tous les clients
app.get('/clients', (req, res) => {
    const query = 'SELECT * FROM Client';
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Erreur récupération clients:', err);
        return res.status(500).json({ message: 'Erreur récupération clients', error: err });
      }
  
      res.status(200).json(results);
    });
  });
  
  // Ajouter un client
app.post('/clients', (req, res) => {
  const { date_debut, date_fin, id_A, num_ch, phone, email } = req.body;

  if (!date_debut || !date_fin || !id_A || !num_ch || !phone || !email) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  const query = `
    INSERT INTO Client (date_debut, date_fin, id_A, num_ch, phone, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [date_debut, date_fin, id_A, num_ch, phone, email], (err, results) => {
    if (err) {
      console.error('Erreur ajout client:', err);
      return res.status(500).json({ message: 'Erreur ajout client', error: err });
    }

    res.status(201).json({ message: 'Client ajouté avec succès', data: results });
  });
});

// Modifier un client
app.put('/clients/:id_C', (req, res) => {
  const { id_C } = req.params;
  const { date_debut, date_fin, id_A, num_ch, phone, email } = req.body;

  if (!date_debut || !date_fin || !id_A || !num_ch || !phone || !email) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  const query = `
    UPDATE Client
    SET date_debut = ?, date_fin = ?, id_A = ?, num_ch = ?, phone = ?, email = ?
    WHERE id_C = ?
  `;

  db.query(query, [date_debut, date_fin, id_A, num_ch, phone, email, id_C], (err, results) => {
    if (err) {
      console.error('Erreur mise à jour client:', err);
      return res.status(500).json({ message: 'Erreur mise à jour client', error: err });
    }

    res.status(200).json({ message: 'Client mis à jour avec succès', data: results });
  });
});

  
  // Supprimer un client
  app.delete('/clients/:id_C', (req, res) => {
    const { id_C } = req.params;
  
    const query = 'DELETE FROM Client WHERE id_C = ?';
  
    db.query(query, [id_C], (err, results) => {
      if (err) {
        console.error('Erreur suppression client:', err);
        return res.status(500).json({ message: 'Erreur suppression client', error: err });
      }
  
      res.status(200).json({ message: 'Client supprimé avec succès', data: results });
    });
  });


  // ✅ GET cleaners avec leurs affectations (assignments) complètes
app.get('/cleaners', (req, res) => {
    const query = `
      SELECT c.id_cleaner, c.id_A, c.status, c.work_days, c.shift,
             n.id_Ch, n.date_heure, n.statut
      FROM Cleaner c
      LEFT JOIN Nettoyer n ON c.id_cleaner = n.id_cleaner
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des cleaners :', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
  
      // Regrouper les chambres par cleaner
      const cleanerMap = new Map();
  
      results.forEach(row => {
        if (!cleanerMap.has(row.id_cleaner)) {
          cleanerMap.set(row.id_cleaner, {
            id_cleaner: row.id_cleaner,
            id_A: row.id_A,
            status: row.status,
            work_days: row.work_days,
            shift: row.shift,
            assignments: row.id_Ch ? [{
              id_Ch: row.id_Ch,
              date_heure: row.date_heure,
              statut: row.statut
            }] : []
          });
        } else if (row.id_Ch) {
          cleanerMap.get(row.id_cleaner).assignments.push({
            id_Ch: row.id_Ch,
            date_heure: row.date_heure,
            statut: row.statut
          });
        }
      });
  
      res.json(Array.from(cleanerMap.values()));
    });
  });
  app.post('/cleaners/:id/assign', (req, res) => {
    const id_cleaner = req.params.id;
    const { id_Ch, date_heure } = req.body;
  
    const query = `
      INSERT INTO Nettoyer (id_Ch, id_cleaner, date_heure, statut)
      VALUES (?, ?, ?, 'In Progress')
    `;
  
    db.query(query, [id_Ch, id_cleaner, date_heure], (err, result) => {
      if (err) {
        console.error("Erreur d'affectation:", err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json({ message: 'Affectation réussie' });
    });
  });
    
  // ✅ Ajouter un cleaner
  app.post('/cleaners', (req, res) => {
    const { id_A, status, work_days, shift } = req.body;
  
    if (!id_A || !status || !work_days || !shift) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
  
    const query = `INSERT INTO Cleaner (id_A, status, work_days, shift) VALUES (?, ?, ?, ?)`;
  
    db.query(query, [id_A, status, work_days, shift], (err, results) => {
      if (err) {
        console.error('Erreur ajout cleaner:', err);
        return res.status(500).json({ message: 'Erreur ajout cleaner', error: err });
      }
  
      res.status(201).json({ message: 'Cleaner ajouté avec succès', data: results });
    });
  });
  
  // ✅ Modifier un cleaner
  app.put('/cleaners/:id_cleaner', (req, res) => {
    const { id_cleaner } = req.params;
    const { id_A, status, work_days, shift } = req.body;
  
    if (!id_A || !status || !work_days || !shift) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
  
    const query = `
      UPDATE Cleaner SET id_A = ?, status = ?, work_days = ?, shift = ?
      WHERE id_cleaner = ?
    `;
  
    db.query(query, [id_A, status, work_days, shift, id_cleaner], (err, results) => {
      if (err) {
        console.error('Erreur mise à jour cleaner:', err);
        return res.status(500).json({ message: 'Erreur mise à jour cleaner', error: err });
      }
  
      res.status(200).json({ message: 'Cleaner mis à jour avec succès', data: results });
    });
  });
  
  // ✅ Supprimer un cleaner
  app.delete('/cleaners/:id_cleaner', (req, res) => {
    const { id_cleaner } = req.params;
  
    const query = `DELETE FROM Cleaner WHERE id_cleaner = ?`;
  
    db.query(query, [id_cleaner], (err, results) => {
      if (err) {
        console.error('Erreur suppression cleaner:', err);
        return res.status(500).json({ message: 'Erreur suppression cleaner', error: err });
      }
  
      res.status(200).json({ message: 'Cleaner supprimé avec succès', data: results });
    });
  });
  
  // ✅ Affecter une chambre à un cleaner disponible
app.post('/assign-cleaning', (req, res) => {
    const { id_Ch } = req.body;
  
    if (!id_Ch) {
      return res.status(400).json({ message: "L'ID de la chambre est requis." });
    }
  
    // 1. Trouver un cleaner disponible
    const findCleaner = `
      SELECT id_cleaner FROM Cleaner WHERE status = 'Available' LIMIT 1
    `;
  
    db.query(findCleaner, (err, cleanerResults) => {
      if (err) {
        console.error("Erreur recherche cleaner :", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
  
      if (cleanerResults.length === 0) {
        return res.status(404).json({ message: "Aucun cleaner disponible" });
      }
  
      const cleanerId = cleanerResults[0].id_cleaner;
  
      // 2. Ajouter dans la table Nettoyer
      const insertAssignment = `
        INSERT INTO Nettoyer (id_Ch, id_cleaner, statut)
        VALUES (?, ?, 'en attente')
      `;
  
      db.query(insertAssignment, [id_Ch, cleanerId], (err, result) => {
        if (err) {
          console.error("Erreur insertion Nettoyer :", err);
          return res.status(500).json({ message: "Erreur lors de l'affectation" });
        }
  
        res.status(201).json({
          message: "Chambre assignée avec succès",
          assignment: {
            id_Ch,
            id_cleaner: cleanerId,
            statut: 'en attente'
          }
        });
      });
    });
  });
  //assignment
  app.get('/assignments', (req, res) => {
    const query = `SELECT * FROM Nettoyer`;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Erreur récupération des assignments:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
      }
  
      res.status(200).json(results);
    });
  });
  app.post('/assignments', (req, res) => {
    const { id_Ch, id_cleaner, date_heure, statut } = req.body;
  
    if (!id_Ch || !id_cleaner || !statut) {
      return res.status(400).json({ message: 'Champs requis manquants.' });
    }
  
    const query = `INSERT INTO Nettoyer (id_Ch, id_cleaner, date_heure, statut) VALUES (?, ?, ?, ?)`;
  
    db.query(query, [id_Ch, id_cleaner, date_heure || new Date(), statut], (err, results) => {
      if (err) {
        console.error('Erreur ajout assignment:', err);
        return res.status(500).json({ message: 'Erreur ajout assignment', error: err });
      }
  
      res.status(201).json({ message: 'Assignment ajouté avec succès', data: results });
    });
  });
  app.put('/assignments/:id_Ch/:id_cleaner', (req, res) => {
    const { id_Ch, id_cleaner } = req.params;
    const { date_heure, statut } = req.body;
  
    const query = `UPDATE Nettoyer SET date_heure = ?, statut = ? WHERE id_Ch = ? AND id_cleaner = ?`;
  
    db.query(query, [date_heure, statut, id_Ch, id_cleaner], (err, results) => {
      if (err) {
        console.error('Erreur modification assignment:', err);
        return res.status(500).json({ message: 'Erreur serveur', error: err });
      }
  
      res.status(200).json({ message: 'Assignment mis à jour', data: results });
    });
  });
  app.delete('/assignments/:id_Ch/:id_cleaner', (req, res) => {
    const { id_Ch, id_cleaner } = req.params;
  
    const query = `DELETE FROM Nettoyer WHERE id_Ch = ? AND id_cleaner = ?`;
  
    db.query(query, [id_Ch, id_cleaner], (err, results) => {
      if (err) {
        console.error('Erreur suppression assignment:', err);
        return res.status(500).json({ message: 'Erreur suppression assignment', error: err });
      }
  
      res.status(200).json({ message: 'Assignment supprimé', data: results });
    });
  });
        
  
  // ✅ RÉCUPÉRER LES INFOS DE L'UTILISATEUR (Profil)
app.get('/profile', (req, res) => {
    const userEmail = req.query.email; 
  
    if (!userEmail) {
      return res.status(400).json({ message: 'Email nécessaire pour récupérer les informations' });
    }
  
    const query = 'SELECT id_U, nom, prenom, adresse, email, contact FROM users WHERE email = ?';
    db.query(query, [userEmail], (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur récupération utilisateur' });
  
      if (results.length > 0) {
        res.status(200).json(results[0]); // Renvoie les données du premier utilisateur trouvé
      } else {
        res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
    });
  });


// ✅ Endpoint : Récupérer toutes les factures
app.get('/invoices', (req, res) => {
  const query = `
    SELECT f.id_F, f.num_reservation, f.montant, f.statut, f.date,
           c.id_C, c.date_debut, c.date_fin
    FROM Facture f
    JOIN Client c ON f.id_C = c.id_C
    ORDER BY f.date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur récupération des factures :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.status(200).json(results);
  });
});

// ✅ Endpoint : Récupérer tous les clients
app.get('/clients', (req, res) => {
  const query = `
    SELECT id_C, date_debut, date_fin
    FROM Client
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur récupération des clients :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.status(200).json(results);
  });
});
// ✅ Ajouter une facture avec calcul du montant via les dates de la table Client
app.post('/invoices', (req, res) => {
  const { id_C, statut, date } = req.body;

  const getClientQuery = `SELECT date_debut, date_fin FROM Client WHERE id_C = ?`;
  db.query(getClientQuery, [id_C], (err, clientResults) => {
    if (err || clientResults.length === 0) {
      return res.status(500).json({ message: 'Client introuvable ou erreur' });
    }

    const { date_debut, date_fin } = clientResults[0];
    const start = new Date(date_debut);
    const end = new Date(date_fin);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const prixParNuit = 100;
    const montant = nights * prixParNuit;

    // Récupère le dernier num_reservation
    const getLastNumQuery = `SELECT MAX(num_reservation) AS lastNum FROM Facture`;
    db.query(getLastNumQuery, (err, result) => {
      if (err) return res.status(500).json({ message: 'Erreur récupération numéro' });

      const lastNum = result[0].lastNum || 1000; // commence à 1001
      const newNumReservation = lastNum + 1;

      const insertQuery = `
        INSERT INTO Facture (id_C, num_reservation, montant, statut, date)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(insertQuery, [id_C, newNumReservation, montant, statut, date], (err) => {
        if (err) return res.status(500).json({ message: 'Erreur insertion' });
        res.status(201).json({ message: 'Facture ajoutée', montant, num_reservation: newNumReservation });
      });
    });
  });
});

// ✅ Modifier une facture
app.put('/invoices/:id', (req, res) => {
  const { id_C, montant, statut, date } = req.body;
  const { id } = req.params;
  const query = `UPDATE Facture SET id_C = ?, montant = ?, statut = ?, date = ? WHERE id_F = ?`;
  db.query(query, [id_C, montant, statut, date, id], (err) => {
    if (err) return res.status(500).json({ message: 'Erreur mise à jour' });
    res.status(200).json({ message: 'Facture mise à jour' });
  });
});
// ✅ Supprimer une facture
app.delete('/invoices/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM Facture WHERE id_F = ?`;
  db.query(query, [id], (err) => {
    if (err) {
      console.error('Erreur suppression facture :', err);
      return res.status(500).json({ message: 'Erreur suppression' });
    }
    res.status(200).json({ message: 'Facture supprimée avec succès' });
  });
});
// ✅ GET all payments
app.get('/api/payments', (req, res) => {
  const query = `
    SELECT id_payment, montant, etat_p, methode, date_p, id_C
    FROM payments
    ORDER BY date_p DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur récupération paiements :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    console.log('Paiements récupérés :', results); // debug
    res.status(200).json(results);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Serveur démarré sur le port ${PORT}`));
