// src/pages/Demandes.js - Version mise à jour avec accepter/refuser
import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Badge,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Dropdown,
  Pagination,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/apiService";
import { toast } from "react-toastify";

const Demandes = () => {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Nouveaux states pour accepter/refuser
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  
  const [machines, setMachines] = useState([]);
  const [composants, setComposants] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    statut: "",
    type_demande: "",
    priorite: "",
    machine_id: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 15,
  });
  const [formData, setFormData] = useState({
    machine_id: "",
    composant_id: "",
    type_demande: "maintenance",
    priorite: "normale",
    titre: "",
    description: "",
    justification: "",
    quantite_demandee: 1,
    budget_estime: "",
    date_souhaite: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDemandes();
    loadMachines();
  }, [filters, pagination.currentPage]);

  const loadDemandes = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== "")
        ),
      };

      const response = await apiService.getDemandes(params);

      if (response.data && response.data.data) {
        setDemandes(response.data.data.data || response.data.data);
        setPagination((prev) => ({
          ...prev,
          currentPage: response.data.data.current_page || 1,
          totalPages: response.data.data.last_page || 1,
          total: response.data.data.total || 0,
        }));
      } else {
        setDemandes([]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des demandes:", error);
      setError("Erreur lors du chargement des demandes");
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMachines = async () => {
    try {
      const response = await apiService.getMachines({ per_page: 100 });
      if (response.data && response.data.data) {
        setMachines(response.data.data.data || response.data.data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des machines:", error);
    }
  };

  const loadComposants = async (machineId) => {
    if (!machineId) {
      setComposants([]);
      return;
    }

    try {
      const response = await apiService.getMachineComposants(machineId);
      setComposants(response.data.data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des composants:", error);
      setComposants([]);
    }
  };

  // Nouvelles fonctions pour accepter/refuser
  const handleAccepter = (demande) => {
    setSelectedDemande(demande);
    setCommentaire("");
    setShowAcceptModal(true);
  };

  const handleRefuser = (demande) => {
    setSelectedDemande(demande);
    setCommentaire("");
    setShowRefuseModal(true);
  };

  const confirmerAcceptation = async () => {
    if (!selectedDemande) return;

    setActionLoading(true);
    try {
      await apiService.accepterDemande(selectedDemande.id, commentaire);
      toast.success("Demande acceptée avec succès");
      setShowAcceptModal(false);
      setSelectedDemande(null);
      setCommentaire("");
      loadDemandes(); // Recharger la liste
    } catch (error) {
      console.error("Erreur lors de l'acceptation:", error);
      toast.error("Erreur lors de l'acceptation de la demande");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmerRefus = async () => {
    if (!selectedDemande || !commentaire.trim()) {
      toast.error("Le motif de refus est obligatoire");
      return;
    }

    setActionLoading(true);
    try {
      await apiService.refuserDemande(selectedDemande.id, commentaire);
      toast.success("Demande refusée avec succès");
      setShowRefuseModal(false);
      setSelectedDemande(null);
      setCommentaire("");
      loadDemandes(); // Recharger la liste
    } catch (error) {
      console.error("Erreur lors du refus:", error);
      toast.error("Erreur lors du refus de la demande");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      statut: "",
      type_demande: "",
      priorite: "",
      machine_id: "",
    });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "machine_id") {
      loadComposants(value);
      setFormData((prev) => ({
        ...prev,
        composant_id: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        quantite_demandee: parseInt(formData.quantite_demandee) || 1,
        budget_estime: formData.budget_estime
          ? parseFloat(formData.budget_estime)
          : null,
      };

      const response = await apiService.createDemande(dataToSubmit);
      toast.success("Demande créée avec succès");
      setShowModal(false);
      resetForm();
      setTimeout(() => {
        loadDemandes();
      }, 500);
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.values(errors)
          .flat()
          .forEach((err) => {
            toast.error(err);
          });
      } else {
        toast.error(
          error.response?.data?.message ||
            "Erreur lors de la création de la demande"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      machine_id: "",
      composant_id: "",
      type_demande: "maintenance",
      priorite: "normale",
      titre: "",
      description: "",
      justification: "",
      quantite_demandee: 1,
      budget_estime: "",
      date_souhaite: "",
    });
    setComposants([]);
  };

  const getStatutBadge = (statut) => {
    const variants = {
      en_attente: "warning",
      en_cours: "info",
      acceptee: "success",
      refusee: "danger",
      terminee: "secondary",
    };
    return (
      <Badge bg={variants[statut] || "secondary"}>
        {statut.replace("_", " ")}
      </Badge>
    );
  };

  const getPrioriteBadge = (priorite) => {
    const variants = {
      basse: "success",
      normale: "info",
      haute: "warning",
      critique: "danger",
    };
    return <Badge bg={variants[priorite] || "info"}>{priorite}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const items = [];
    const currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;

    if (currentPage > 1) {
      items.push(
        <Pagination.Item key="first" onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
    }

    for (
      let i = Math.max(1, currentPage - 2);
      i <= Math.min(totalPages, currentPage + 2);
      i++
    ) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (currentPage < totalPages) {
      items.push(
        <Pagination.Item
          key="last"
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center">
        <Pagination.Prev
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        />
        {items}
        <Pagination.Next
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        />
      </Pagination>
    );
  };

  if (loading && demandes.length === 0) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="demandes-page">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-file-alt me-2"></i>
                Gestion des Demandes
              </h2>
              <p className="text-muted mb-0">
                {pagination.total} demande(s) trouvée(s)
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowModal(true)}
              className="d-flex align-items-center"
            >
              <i className="fas fa-plus me-2"></i>
              Nouvelle Demande
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Rechercher une demande..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => handleFilterChange("statut", e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="acceptee">Acceptée</option>
                <option value="refusee">Refusée</option>
                <option value="terminee">Terminée</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.type_demande}
                onChange={(e) =>
                  handleFilterChange("type_demande", e.target.value)
                }
              >
                <option value="">Tous les types</option>
                <option value="maintenance">Maintenance</option>
                <option value="piece">Pièce</option>
                <option value="reparation">Réparation</option>
                <option value="inspection">Inspection</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.priorite}
                onChange={(e) => handleFilterChange("priorite", e.target.value)}
              >
                <option value="">Toutes les priorités</option>
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.machine_id}
                onChange={(e) =>
                  handleFilterChange("machine_id", e.target.value)
                }
              >
                <option value="">Toutes les machines</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.nom}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={1}>
              <Button
                variant="outline-secondary"
                onClick={clearFilters}
                title="Effacer les filtres"
              >
                <i className="fas fa-times"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste des demandes */}
      <Card>
        <Card.Body className="p-0">
          {demandes.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-file-alt fa-3x text-muted mb-3"></i>
              <h4>Aucune demande trouvée</h4>
              <p className="text-muted mb-4">
                {Object.values(filters).some((filter) => filter !== "")
                  ? "Aucune demande ne correspond à vos critères de recherche."
                  : "Commencez par créer votre première demande"}
              </p>
              {Object.values(filters).some((filter) => filter !== "") ? (
                <Button variant="outline-primary" onClick={clearFilters}>
                  <i className="fas fa-times me-2"></i>
                  Effacer les filtres
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  <i className="fas fa-plus me-2"></i>
                  Créer une demande
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Numéro</th>
                      <th>Titre</th>
                      <th>Machine</th>
                      <th>Type</th>
                      <th>Priorité</th>
                      <th>Statut</th>
                      <th>Demandeur</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandes.map((demande) => (
                      <tr key={demande.id}>
                        <td>
                          <span className="fw-bold text-primary">
                            {demande.numero_demande}
                          </span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">{demande.titre}</div>
                            {demande.description && (
                              <small className="text-muted">
                                {demande.description.length > 50
                                  ? `${demande.description.substring(0, 50)}...`
                                  : demande.description}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">
                              {demande.machine?.nom}
                            </div>
                            {demande.machine?.localisation && (
                              <small className="text-muted">
                                {demande.machine.localisation}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge bg="info">{demande.type_demande}</Badge>
                        </td>
                        <td>{getPrioriteBadge(demande.priorite)}</td>
                        <td>{getStatutBadge(demande.statut)}</td>
                        <td>
                          <div>
                            <div className="fw-bold">{demande.user?.name}</div>
                            <small className="text-muted">
                              {demande.user?.email}
                            </small>
                          </div>
                        </td>
                        <td>{formatDate(demande.created_at)}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              as={Link}
                              to={`/demandes/${demande.id}`}
                              variant="outline-primary"
                              size="sm"
                              title="Voir les détails"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>

                            {/* Boutons admin pour accepter/refuser */}
                            {user?.role === "admin" &&
                              demande.statut === "en_attente" && (
                                <>
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    title="Accepter"
                                    onClick={() => handleAccepter(demande)}
                                  >
                                    <i className="fas fa-check"></i>
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    title="Refuser"
                                    onClick={() => handleRefuser(demande)}
                                  >
                                    <i className="fas fa-times"></i>
                                  </Button>
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <div className="text-muted">
                    Affichage de{" "}
                    {(pagination.currentPage - 1) * pagination.perPage + 1} à{" "}
                    {Math.min(
                      pagination.currentPage * pagination.perPage,
                      pagination.total
                    )}{" "}
                    sur {pagination.total} demandes
                  </div>
                  {renderPagination()}
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal de création */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-plus me-2"></i>
            Nouvelle Demande
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Machine <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="machine_id"
                    value={formData.machine_id}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Sélectionnez une machine</option>
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.nom} - {machine.localisation}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Composant</Form.Label>
                  <Form.Select
                    name="composant_id"
                    value={formData.composant_id}
                    onChange={handleFormChange}
                    disabled={!formData.machine_id}
                  >
                    <option value="">Aucun composant spécifique</option>
                    {composants.map((composant) => (
                      <option key={composant.id} value={composant.id}>
                        {composant.nom} ({composant.reference})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Optionnel - Sélectionnez d'abord une machine
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Type de demande <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="type_demande"
                    value={formData.type_demande}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="piece">Pièce</option>
                    <option value="reparation">Réparation</option>
                    <option value="inspection">Inspection</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Priorité</Form.Label>
                  <Form.Select
                    name="priorite"
                    value={formData.priorite}
                    onChange={handleFormChange}
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Titre <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="titre"
                    value={formData.titre}
                    onChange={handleFormChange}
                    placeholder="Titre de la demande"
                    maxLength={150}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Description <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Description détaillée de la demande"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Justification</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="justification"
                    value={formData.justification}
                    onChange={handleFormChange}
                    placeholder="Justification de la demande (optionnel)"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Quantité</Form.Label>
                  <Form.Control
                    type="number"
                    name="quantite_demandee"
                    value={formData.quantite_demandee}
                    onChange={handleFormChange}
                    min="1"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Budget estimé (€)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="budget_estime"
                    value={formData.budget_estime}
                    onChange={handleFormChange}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Date souhaitée</Form.Label>
                  <Form.Control
                    type="date"
                    name="date_souhaite"
                    value={formData.date_souhaite}
                    onChange={handleFormChange}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Création...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Créer la demande
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal d'acceptation */}
      <Modal show={showAcceptModal} onHide={() => setShowAcceptModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-success">
            <i className="fas fa-check me-2"></i>
            Accepter la demande
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDemande && (
            <>
              <div className="mb-3">
                <strong>Demande:</strong> #{selectedDemande.numero_demande}
              </div>
              <div className="mb-3">
                <strong>Titre:</strong> {selectedDemande.titre}
              </div>
              <div className="mb-3">
                <strong>Demandeur:</strong> {selectedDemande.user?.name}
              </div>
              
              <Form.Group>
                <Form.Label>Commentaire (optionnel)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Ajouter un commentaire pour le demandeur..."
                />
                <Form.Text className="text-muted">
                  Ce commentaire sera envoyé au demandeur avec la notification d'acceptation.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAcceptModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="success" 
            onClick={confirmerAcceptation}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Acceptation...
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>
                Accepter la demande
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de refus */}
      <Modal show={showRefuseModal} onHide={() => setShowRefuseModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <i className="fas fa-times me-2"></i>
            Refuser la demande
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDemande && (
            <>
              <div className="mb-3">
                <strong>Demande:</strong> #{selectedDemande.numero_demande}
              </div>
              <div className="mb-3">
                <strong>Titre:</strong> {selectedDemande.titre}
              </div>
              <div className="mb-3">
                <strong>Demandeur:</strong> {selectedDemande.user?.name}
              </div>
              
              <Form.Group>
                <Form.Label>
                  Motif du refus <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Expliquer le motif du refus..."
                  required
                />
                <Form.Text className="text-muted">
                  Ce motif sera envoyé au demandeur avec la notification de refus.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefuseModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmerRefus}
            disabled={actionLoading || !commentaire.trim()}
          >
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Refus...
              </>
            ) : (
              <>
                <i className="fas fa-times me-2"></i>
                Refuser la demande
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Demandes;